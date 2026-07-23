'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE checklist_executions MODIFY COLUMN shift ENUM('morning','afternoon','night','manha','tarde','noite') NOT NULL",
    );
    await queryInterface.sequelize.query(
      "UPDATE checklist_executions SET shift = CASE shift WHEN 'morning' THEN 'manha' WHEN 'afternoon' THEN 'tarde' WHEN 'night' THEN 'noite' ELSE shift END",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE checklist_executions MODIFY COLUMN shift ENUM('manha','tarde','noite') NOT NULL",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE checklist_executions MODIFY COLUMN shift ENUM('morning','afternoon','night','manha','tarde','noite') NOT NULL",
    );
    await queryInterface.sequelize.query(
      "UPDATE checklist_executions SET shift = CASE shift WHEN 'manha' THEN 'morning' WHEN 'tarde' THEN 'afternoon' WHEN 'noite' THEN 'night' ELSE shift END",
    );
    await queryInterface.sequelize.query(
      "ALTER TABLE checklist_executions MODIFY COLUMN shift ENUM('morning','afternoon','night') NOT NULL",
    );
  },
};
