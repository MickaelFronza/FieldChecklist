'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // nullable de proposito, mesmo sendo obrigatorio no app mobile: apps ja
    // instalados antes dessa versao continuam sincronizando sem esses campos
    // ate o operador atualizar o app (rollout de mobile e mais lento que o
    // do backend, nao da pra travar o sync de quem ainda esta na versao velha)
    await queryInterface.addColumn('checklist_executions', 'odometer_km', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('checklist_executions', 'fuel_level', {
      type: Sequelize.ENUM('vazio', 'quarto', 'metade', 'tres_quartos', 'cheio'),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('checklist_executions', 'fuel_level');
    await queryInterface.removeColumn('checklist_executions', 'odometer_km');
  },
};
