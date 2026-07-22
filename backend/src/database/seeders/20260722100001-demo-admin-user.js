'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const pinHash = await bcrypt.hash('1234', 10);
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        name: 'Admin',
        pin_hash: pinHash,
        role: 'admin',
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { name: 'Admin' });
  },
};
