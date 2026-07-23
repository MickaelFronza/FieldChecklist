'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'max_devices', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'max_devices');
  },
};
