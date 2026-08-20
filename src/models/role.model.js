const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Role extends Model {
  static associate(db) {
    Role.hasMany(db.User, { foreignKey: 'role_id', as: 'users' });
    Role.belongsToMany(db.Permission, {
      through:    'role_permissions',
      foreignKey: 'role_id',
      otherKey:   'permission_id',
      as:         'permissions',
    });
  }
}

Role.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(60),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(200), allowNull: true  },
    active:      { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName:  'Role',
    tableName:  'roles',
    timestamps: false,
  }
);

module.exports = Role;