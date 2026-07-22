'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('execution_items', {
      id: {
        // gerado no device (UUIDv4) - sem defaultValue, client define
        type: Sequelize.UUID,
        primaryKey: true,
      },
      execution_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'checklist_executions', key: 'id' },
        onDelete: 'CASCADE',
      },
      template_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'template_items', key: 'id' },
      },
      status: {
        type: Sequelize.ENUM('ok', 'non_conformant', 'not_applicable', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
      },
      justification: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photo_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      photo_hash: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      marked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      synced_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('execution_items');
  },
};
