import PropTypes from 'prop-types';
import React from 'react';

import {t} from 'app/locale';
import {DESCRIPTIONS} from 'app/views/settings/organizationDeveloperSettings/constants';
import styled from 'react-emotion';
import Checkbox from 'app/components/checkbox';
import Tooltip from 'app/components/tooltip';
import {Flex} from 'grid-emotion';
import withOrganization from 'app/utils/withOrganization';
import SentryTypes from 'app/sentryTypes';

export class SubscriptionBox extends React.Component {
  static propTypes = {
    resource: PropTypes.string.isRequired,
    disabledFromPermissions: PropTypes.bool.isRequired,
    webhookDisabled: PropTypes.bool.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    organization: SentryTypes.Organization,
  };

  static defaultProps = {
    webhookDisabled: false,
  };

  onChange = evt => {
    const checked = evt.target.checked;
    const {resource} = this.props;
    this.props.onChange(resource, checked);
  };

  render() {
    const {resource, organization, webhookDisabled, checked} = this.props;
    const features = new Set(organization.features);

    let disabled = this.props.disabledFromPermissions || webhookDisabled;
    let message = `Must have at least 'Read' permissions enabled for ${resource}`;
    if (resource === 'error' && !features.has('integrations-event-hooks')) {
      disabled = true;
      message =
        'Your organization does not have access to the error subscription resource.';
    }
    if (webhookDisabled) {
      message = 'Cannot enable webhook subscription without specifying a webhook url';
    }

    return (
      <React.Fragment>
        <SubscriptionGridItemWrapper key={resource}>
          <Tooltip disabled={!disabled} title={message}>
            <SubscriptionGridItem disabled={disabled}>
              <SubscriptionInfo>
                <SubscriptionTitle>{t(`${resource}`)}</SubscriptionTitle>
                <SubscriptionDescription>
                  {t(`${DESCRIPTIONS[resource]}`)}
                </SubscriptionDescription>
              </SubscriptionInfo>
              <Checkbox
                key={`${resource}${checked}`}
                disabled={disabled}
                id={resource}
                value={resource}
                checked={checked}
                onChange={this.onChange}
              />
            </SubscriptionGridItem>
          </Tooltip>
        </SubscriptionGridItemWrapper>
      </React.Fragment>
    );
  }
}

export default withOrganization(SubscriptionBox);

const SubscriptionInfo = styled(Flex)`
  flex-direction: column;
`;

const SubscriptionGridItem = styled('div')`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  background: ${p => p.theme.whiteDark};
  opacity: ${p => (p.disabled ? 0.3 : 1)};
  border-radius: 3px;
  flex: 1;
  padding: 12px;
  height: 100%;
`;

const SubscriptionGridItemWrapper = styled('div')`
  padding: 12px;
  width: 33%;
`;

const SubscriptionDescription = styled('div')`
  font-size: 12px;
  line-height: 1;
  color: ${p => p.theme.gray2};
  white-space: nowrap;
`;

const SubscriptionTitle = styled('div')`
  font-size: 16px;
  line-height: 1;
  color: ${p => p.theme.textColor};
  white-space: nowrap;
  margin-bottom: 5px;
`;
