'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicle_operators', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'vehicles', key: 'id' },
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('vehicle_operators', {
      fields: ['vehicle_id', 'user_id'],
      unique: true,
      name: 'idx_vehicle_operators_vehicle_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicle_operators');
  },
};
