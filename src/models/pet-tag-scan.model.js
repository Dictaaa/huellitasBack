const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class PetTagScan extends Model {
  static associate(db) {
    PetTagScan.belongsTo(db.PetTag, { foreignKey: 'pet_tag_id', as: 'tag' });
    PetTagScan.belongsTo(db.Pet,    { foreignKey: 'pet_id',     as: 'pet' });
  }
}

PetTagScan.init(
  {
    id:             { type: DataTypes.BIGINT,     primaryKey: true, autoIncrement: true },
    pet_tag_id:     { type: DataTypes.BIGINT,     allowNull: false },
    pet_id:         { type: DataTypes.BIGINT,     allowNull: true  },
    scanned_at:     { type: DataTypes.DATE,       allowNull: false, defaultValue: DataTypes.NOW },
    city:           { type: DataTypes.STRING(80), allowNull: true  },
    region:         { type: DataTypes.STRING(80), allowNull: true  },
    country_code:   { type: DataTypes.CHAR(2),    allowNull: true  },
    device_type: {
      type:         DataTypes.ENUM('mobile','tablet','desktop','unknown'),
      allowNull:    true,
      defaultValue: 'unknown',
    },
    user_agent:      { type: DataTypes.STRING(300), allowNull: true },
    action_taken:    { type: DataTypes.STRING(80),  allowNull: true },
    found_report_id: { type: DataTypes.BIGINT,      allowNull: true },
  },
  {
    sequelize,
    modelName:  'PetTagScan',
    tableName:  'pet_tag_scans',
    timestamps: false,
  }
);

module.exports = PetTagScan;