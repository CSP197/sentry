from __future__ import absolute_import

from django.db.models.signals import post_save
from django.dispatch import receiver

from sentry.models import Group, GroupAssignee, Organization
from sentry.signals import (
    issue_ignored,
    issue_assigned,
    issue_resolved,
    resolved_with_commit,
)
from sentry.tasks.sentry_apps import (
    process_resource_change_bound,
    workflow_notification,
)


@receiver(post_save, sender=Group, weak=False)
def issue_saved(sender, instance, created, **kwargs):
    issue = instance

    # We only send webhooks for creation right now.
    if not created:
        return

    process_resource_change_bound.delay(
        action='created',
        sender=sender.__name__,
        instance_id=issue.id,
    )


@issue_assigned.connect(weak=False)
def send_issue_assigned_webhook(project, group, user, **kwargs):
    assignee = GroupAssignee.objects.get(
        group_id=group.id,
    ).assigned_actor()

    actor = assignee.resolve()

    data = {
        'assignee': {
            'type': assignee.type.__name__.lower(),
            'name': actor.name,
            'id': actor.id,
        }
    }

    org = project.organization

    if hasattr(actor, 'email') and not org.flags.enhanced_privacy:
        data['assignee']['email'] = actor.email

    send_workflow_webhooks(org, group, user, 'issue.assigned', data=data)


@issue_resolved.connect(weak=False)
def send_issue_resolved_webhook(project, group, user, resolution_type, **kwargs):
    resolution_type = resolution_type
    if resolution_type in ('in_next_release', 'in_release'):
        resolution_type = 'resolved_in_release'
    else:
        resolution_type = 'resolved'

    send_workflow_webhooks(
        project.organization,
        group,
        user,
        'issue.resolved',
        data={'resolution_type': resolution_type},
    )


@issue_ignored.connect(weak=False)
def send_issue_ignored_webhook(project, user, group_list, **kwargs):
    for issue in group_list:
        send_workflow_webhooks(
            project.organization,
            issue,
            user,
            'issue.ignored',
        )


@resolved_with_commit.connect(weak=False)
def send_resolved_with_commit_webhook(organization_id, group, user, **kwargs):
    organization = Organization.objects.get(id=organization_id)
    send_workflow_webhooks(
        organization,
        group,
        user,
        'issue.resolved',
        data={'resolution_type': 'resolved_in_commit'},
    )


def send_workflow_webhooks(organization, issue, user, event, data=None):
    data = data or {}

    for install in installations_to_notify(organization, event):
        workflow_notification.delay(
            installation_id=install.id,
            issue_id=issue.id,
            type=event.split('.')[-1],
            user_id=(user.id if user else None),
            data=data,
        )


def installations_to_notify(organization, event):
    installations = organization  \
        .sentry_app_installations \
        .select_related('sentry_app')

    return filter(lambda i: event in i.sentry_app.events, installations)
