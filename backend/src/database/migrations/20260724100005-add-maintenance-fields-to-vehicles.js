'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // null = manutencao preventiva desligada pra esse veiculo (comportamento
    // atual preservado ate o gestor configurar um intervalo)
    await queryInterface.addColumn('vehicles', 'maintenance_interval_km', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('vehicles', 'last_maintenance_km', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vehicles', 'last_maintenance_km');
    await queryInterface.removeColumn('vehicles', 'maintenance_interval_km');
  },
};
