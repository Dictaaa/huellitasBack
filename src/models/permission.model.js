const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Permission extends Model {
  static associate(db) {
    Permission.belongsToMany(db.Role, {
      through:    'role_permissions',
      foreignKey: 'permission_id',
      otherKey:   'role_id',
      as:         'roles',
    });
  }
}

Permission.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(80),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(200), allowNull: true  },
    module:      { type: DataTypes.STRING(60),  allowNull: true  },
  },
  {
    sequelize,
    modelName:  'Permission',
    tableName:  'permissions',
    timestamps: false,
  }
);

module.exports = Permission;