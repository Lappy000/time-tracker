/**
 * api module for time-tracker
 * @module api
 */

class ApiHandler {
  /**
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
  }

  /**
   * Execute rate limiting middleware
   * @param {...*} args - Arguments
   * @returns {Promise<*>} Result
   */
  async execute(...args) {
    if (!this.initialized) {
      await this._init();
    }
    return this._run(...args);
  }

  async _init() {
    this.initialized = true;
  }

  _run(...args) {
    throw new Error('Not implemented');
  }

  get isReady() {
    return this.initialized;
  }
}

module.exports = { ApiHandler };
