import React from 'react';
import {mount} from 'enzyme';

import IncidentsContainer from 'app/views/incidents';

describe('IncidentsContainer', function() {
  describe('no access without feature flag', function() {
    it('display no access message', function() {
      const organization = TestStubs.Organization({projects: [TestStubs.Project()]});
      const wrapper = mount(
        <IncidentsContainer />,
        TestStubs.routerContext([{organization}])
      );
      expect(wrapper.text()).toBe("You don't have access to this feature");
    });
  });
});
