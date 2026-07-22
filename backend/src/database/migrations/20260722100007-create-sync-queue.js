'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_queue', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      device_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      execution_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      payload_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'done', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('sync_queue', {
      fields: ['execution_id', 'payload_hash'],
      unique: true,
      name: 'uniq_execution_payload',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sync_queue');
  },
};
