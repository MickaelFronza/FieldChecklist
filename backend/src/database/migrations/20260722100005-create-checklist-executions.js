'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('checklist_executions', {
      id: {
        // gerado no device (UUIDv4) - sem defaultValue, client define
        type: Sequelize.UUID,
        primaryKey: true,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'checklist_templates', key: 'id' },
      },
      machine_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'machines', key: 'id' },
      },
      operator_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      shift: {
        type: Sequelize.ENUM('morning', 'afternoon', 'night'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'incomplete'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      device_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      app_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // "um checklist aberto por turno" e por dia (started_at) e regra de negocio
    // aplicada na camada de service (nao da para expressar em unique constraint
    // sem uma coluna de data dedicada, pois started_at carrega hora tambem)
    await queryInterface.addIndex('checklist_executions', {
      fields: ['operator_id', 'machine_id', 'shift', 'status'],
      name: 'idx_operator_machine_shift_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('checklist_executions');
  },
};
