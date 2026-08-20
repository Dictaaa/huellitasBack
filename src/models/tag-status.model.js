const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class TagStatus extends Model {
  static associate(db) {
    TagStatus.hasMany(db.PetTag, { foreignKey: 'status_id', as: 'tags' });
  }
}

TagStatus.init(
  {
    id:          { type: DataTypes.SMALLINT,    primaryKey: true, autoIncrement: true },
    name:        { type: DataTypes.STRING(40),  allowNull: false, unique: true },
    description: { type: DataTypes.STRING(120), allowNull: true  },
  },
  {
    sequelize,
    modelName:  'TagStatus',
    tableName:  'tag_statuses',
    timestamps: false,
  }
);

module.exports = TagStatus;