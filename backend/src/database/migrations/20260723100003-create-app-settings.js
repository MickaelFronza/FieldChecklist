'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_settings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        defaultValue: 1,
      },
      max_total_devices: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.bulkInsert('app_settings', [
      { id: 1, max_total_devices: null, created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('app_settings');
  },
};
