module.exports = (sequelize, DataTypes) => sequelize.define('Game', {
  publisherId: DataTypes.STRING,
  name: DataTypes.STRING,
  platform: DataTypes.STRING,
  storeId: DataTypes.STRING,
  bundleId: DataTypes.STRING,
  appVersion: DataTypes.STRING,
  isPublished: DataTypes.BOOLEAN,
}, {});
