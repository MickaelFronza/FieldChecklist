'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable('machines', 'vehicles');
    await queryInterface.renameColumn('checklist_templates', 'machine_type', 'vehicle_type');

    // checklist_executions.machine_id carrega uma FK (+ indice auto-criado pra
    // ela) e faz parte de um indice composto - o MariaDB recusa o rename via
    // queryInterface.renameColumn nesse caso ("Cannot drop index ... needed in
    // a foreign key constraint"), entao a FK precisa cair antes e a coluna e
    // recriada via SQL explicito (preservando CHARACTER SET/COLLATE utf8mb4_bin,
    // igual as outras colunas de UUID da tabela - sem isso o rename generico
    // reverte pra collation default da tabela e a FK falha ao ser recriada)
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions DROP FOREIGN KEY checklist_executions_ibfk_2',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions CHANGE COLUMN machine_id vehicle_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL',
    );
    await queryInterface.sequelize.query('ALTER TABLE checklist_executions RENAME INDEX machine_id TO vehicle_id');
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions RENAME INDEX idx_operator_machine_shift_status TO idx_operator_vehicle_shift_status',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions ADD CONSTRAINT checklist_executions_ibfk_2 FOREIGN KEY (vehicle_id) REFERENCES vehicles (id)',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions DROP FOREIGN KEY checklist_executions_ibfk_2',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions RENAME INDEX idx_operator_vehicle_shift_status TO idx_operator_machine_shift_status',
    );
    await queryInterface.sequelize.query('ALTER TABLE checklist_executions RENAME INDEX vehicle_id TO machine_id');
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions CHANGE COLUMN vehicle_id machine_id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE checklist_executions ADD CONSTRAINT checklist_executions_ibfk_2 FOREIGN KEY (machine_id) REFERENCES machines (id)',
    );
    await queryInterface.renameColumn('checklist_templates', 'vehicle_type', 'machine_type');
    await queryInterface.renameTable('vehicles', 'machines');
  },
};
