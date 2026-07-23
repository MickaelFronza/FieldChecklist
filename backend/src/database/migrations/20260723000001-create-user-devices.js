'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_devices', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      device_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      device_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      first_seen_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      last_seen_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('user_devices', {
      fields: ['user_id', 'device_id'],
      unique: true,
      name: 'uniq_user_device',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_devices');
  },
};
