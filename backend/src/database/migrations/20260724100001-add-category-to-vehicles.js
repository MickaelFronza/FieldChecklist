'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('vehicles', 'category', {
      type: Sequelize.ENUM('carro', 'onibus', 'navio', 'caminhao', 'trator', 'moto', 'outro'),
      allowNull: false,
      defaultValue: 'outro',
    });
    // texto livre de proposito - aceita formato antigo (ABC-1234) e Mercosul
    // (BEY-0C83), sem travar num regex unico; opcional porque nem todo
    // veiculo (ex.: navio) tem placa nesse padrao
    await queryInterface.addColumn('vehicles', 'plate', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('vehicles', 'plate');
    await queryInterface.removeColumn('vehicles', 'category');
  },
};
