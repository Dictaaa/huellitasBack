// src/models/pet-tag.model.js
const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class PetTag extends Model {
  // ── Helpers ───────────────────────────────────────────
  isAvailable()  { return this.status_id === 1; }
  isAssigned()   { return this.status_id === 2; }

  getPublicUrl() {
    const base = process.env.APP_URL || 'https://huellita.co';
    return `${base}/p/${this.public_code}`;
  }

  // ── Asociaciones ──────────────────────────────────────
  static associate(db) {
    PetTag.belongsTo(db.Pet,       { foreignKey: 'pet_id',    as: 'pet'     });
    PetTag.belongsTo(db.TagStatus, { foreignKey: 'status_id', as: 'status'  });

    PetTag.hasMany(db.PetTagHistory, { foreignKey: 'pet_tag_id', as: 'history' });
    PetTag.hasMany(db.PetTagScan,    { foreignKey: 'pet_tag_id', as: 'scans'   });
  }
}

PetTag.init(
  {
    id: {
      type:          DataTypes.BIGINT,
      primaryKey:    true,
      autoIncrement: true,
    },
    public_code: {
      type:      DataTypes.STRING(10),
      allowNull: false,
      unique:    true,
      comment:   'Impreso en la placa física. URL: /p/H8F32K',
    },
    qr_token: {
      type:         DataTypes.UUID,
      allowNull:    false,
      unique:       true,
      defaultValue: () => uuidv4(),
      comment:      'UUID codificado en el QR digital. Uso interno/APIs.',
    },
    pet_id:    { type: DataTypes.BIGINT, allowNull: true  },
    status_id: { type: DataTypes.SMALLINT,        allowNull: false, defaultValue: 1 },
    batch_code:{ type: DataTypes.STRING(40),       allowNull: true  },

    activated_at:   { type: DataTypes.DATE, allowNull: true },
    deactivated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName:  'PetTag',
    tableName:  'pet_tags',
    timestamps: true,
    createdAt:  'created_at',
    updatedAt:  'updated_at',
    scopes: {
      available: { where: { status_id: 1 } },
      assigned:  { where: { status_id: 2 } },
    },
  }
);

module.exports = PetTag;