const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetTagHistory extends Model {
  static associate(db) {
    PetTagHistory.belongsTo(db.PetTag, { foreignKey: 'pet_tag_id', as: 'tag' });
    PetTagHistory.belongsTo(db.Pet,    { foreignKey: 'pet_id',     as: 'pet' });
  }
}

PetTagHistory.init(
  {
    id:          { type: DataTypes.BIGINT,      primaryKey: true, autoIncrement: true },
    pet_tag_id:  { type: DataTypes.BIGINT,      allowNull: false },
    pet_id:      { type: DataTypes.BIGINT,      allowNull: false },
    assigned_at: { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
    removed_at:  { type: DataTypes.DATE,        allowNull: true  },
    reason:      { type: DataTypes.STRING(200), allowNull: true  },
    created_by:  { type: DataTypes.BIGINT,      allowNull: true  },
  },
  {
    sequelize,
    modelName:  'PetTagHistory',
    tableName:  'pet_tag_history',
    timestamps: false,
  }
);

module.exports = PetTagHistory;