'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicle_types', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // backfill com os tipos que ja estao em uso hoje (vehicles.type e
    // checklist_templates.vehicle_type) - sem isso, um tipo que o cliente ja
    // usa (ex.: "Trator") sumiria da lista assim que essa migration rodasse,
    // ja que o cadastro de veiculo/template passa a so aceitar tipos
    // registrados aqui. INSERT IGNORE pula duplicata sem quebrar a unique.
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO vehicle_types (id, name, created_at, updated_at)
       SELECT UUID(), t.type, NOW(), NOW() FROM (SELECT DISTINCT type FROM vehicles) t`,
    );
    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO vehicle_types (id, name, created_at, updated_at)
       SELECT UUID(), t.vehicle_type, NOW(), NOW()
       FROM (SELECT DISTINCT vehicle_type FROM checklist_templates WHERE vehicle_type IS NOT NULL) t`,
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicle_types');
  },
};
