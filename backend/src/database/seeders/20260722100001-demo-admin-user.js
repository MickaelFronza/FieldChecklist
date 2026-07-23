'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // idempotente: sequelize-cli nao rastreia seeders ja executados por
    // padrao, entao db:seed:all re-roda este arquivo toda vez - sem essa
    // checagem, cada execucao criaria mais um usuario "Admin" duplicado
    const [existingAdmin] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT },
    );
    if (existingAdmin) return;

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
