'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('checklist_executions', 'started_lat', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn('checklist_executions', 'started_lng', {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('checklist_executions', 'started_lat');
    await queryInterface.removeColumn('checklist_executions', 'started_lng');
  },
};
