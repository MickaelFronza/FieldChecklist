'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addColumn('users', 'password_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.changeColumn('users', 'pin_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'email');
    await queryInterface.removeColumn('users', 'password_hash');
    await queryInterface.changeColumn('users', 'pin_hash', {
      type: Sequelize.STRING(64),
      allowNull: false,
    });
  },
};
