'use strict';
require('dotenv').config();
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_EMAIL || 'admin@fieldcheck.local';
    const password = process.env.ADMIN_PASSWORD || 'admin12345';
    const passwordHash = await bcrypt.hash(password, 10);

    await queryInterface.bulkUpdate(
      'users',
      {
        email,
        password_hash: passwordHash,
        pin_hash: null,
        max_devices: 5,
        updated_at: new Date(),
      },
      { role: 'admin' },
    );
  },

  async down(queryInterface) {
    const pinHash = await bcrypt.hash('1234', 10);
    await queryInterface.bulkUpdate(
      'users',
      { email: null, password_hash: null, pin_hash: pinHash, max_devices: 2 },
      { role: 'admin' },
    );
  },
};
