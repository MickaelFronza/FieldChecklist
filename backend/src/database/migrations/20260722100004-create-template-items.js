'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('template_items', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'checklist_templates', key: 'id' },
        onDelete: 'CASCADE',
      },
      order_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photo_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_blocking: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      category: {
        type: Sequelize.STRING(50),
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
    await queryInterface.dropTable('template_items');
  },
};
