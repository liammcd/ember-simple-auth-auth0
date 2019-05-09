import { get } from '@ember/object';
import { isPresent } from '@ember/utils';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import DataAdapterMixin from "ember-simple-auth/mixins/data-adapter-mixin";

export default JSONAPIAdapter.extend(DataAdapterMixin, {
  authorize(xhr) {
    const { idToken } = get(this, 'session.data.authenticated');
    if (isPresent(idToken)) {
      xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
    }
  }
});
