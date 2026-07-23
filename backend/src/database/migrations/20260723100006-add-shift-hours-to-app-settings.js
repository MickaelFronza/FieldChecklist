'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('app_settings', 'morning_start_hour', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('app_settings', 'afternoon_start_hour', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 12,
    });
    await queryInterface.addColumn('app_settings', 'night_start_hour', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 18,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('app_settings', 'morning_start_hour');
    await queryInterface.removeColumn('app_settings', 'afternoon_start_hour');
    await queryInterface.removeColumn('app_settings', 'night_start_hour');
  },
};
