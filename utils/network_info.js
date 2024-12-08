const os = require('os');
const publicIp = require('public-ip');

class NetworkInfo {
  constructor() {
    this.privateAddress = null;
    this.publicAddress = null;
  }

  async getAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    // Find the IP address of the interface that is connected to the network
    Object.values(interfaces).forEach((iface) => {
      iface.forEach((details) => {
        if (!details.internal && details.family === 'IPv4') {
          addresses.push(details.address);
        }
      });
    });

    this.privateAddress = addresses[0];
    this.publicAddress = await publicIp.v4();
  }

  getPrivateAddress() {
    if (!this.privateAddress) {
      throw new Error('IP addresses have not been fetched yet. Call getAddresses() first.');
    }
    return this.privateAddress;
  }

  getPublicAddress() {
    if (!this.publicAddress) {
      throw new Error('IP addresses have not been fetched yet. Call getAddresses() first.');
    }
    return this.publicAddress;
  }
}

module.exports = NetworkInfo;
