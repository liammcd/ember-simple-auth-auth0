import EmberError from '@ember/error';

export function Auth0Error(payload) {
  let message = 'Auth0 operation failed'

  if(typeof payload === 'object' && payload !== null) {
    if (payload.error_description) {
      payload.error_description = decodeURI(payload.error_description);
    }
    const errorCode = payload.error || 'unknown'
    const errorDesc = payload.error_description || message
    message = `Auth0 returned error \`${errorCode}\`: ${errorDesc}`
    this.name = errorCode;
  } else if(typeof payload === 'string') {
    message += `: ${payload}`
    payload = {}
  }

  EmberError.call(this, message);
  this.payload = payload;
}

Auth0Error.prototype = Object.create(EmberError.prototype);
