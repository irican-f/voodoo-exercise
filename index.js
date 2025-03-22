const express = require('express');
const bodyParser = require('body-parser');
const { Op } = require('sequelize');
const axios = require('axios');
const db = require('./models');

const app = express();

app.use(bodyParser.json());
app.use(express.static(`${__dirname}/static`));

app.get('/api/games', (req, res) => db.Game.findAll()
  .then((games) => res.send(games))
  .catch((err) => {
    console.log('There was an error querying games', JSON.stringify(err));
    return res.send(err);
  }));

app.post('/api/games', (req, res) => {
  const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
  return db.Game.create({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
    .then((game) => res.send(game))
    .catch((err) => {
      console.log('***There was an error creating a game', JSON.stringify(err));
      return res.status(400).send(err);
    });
});

app.delete('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => game.destroy({ force: true }))
    .then(() => res.send({ id }))
    .catch((err) => {
      console.log('***Error deleting game', JSON.stringify(err));
      res.status(400).send(err);
    });
});

app.put('/api/games/:id', (req, res) => {
  // eslint-disable-next-line radix
  const id = parseInt(req.params.id);
  return db.Game.findByPk(id)
    .then((game) => {
      const { publisherId, name, platform, storeId, bundleId, appVersion, isPublished } = req.body;
      return game.update({ publisherId, name, platform, storeId, bundleId, appVersion, isPublished })
        .then(() => res.send(game))
        .catch((err) => {
          console.log('***Error updating game', JSON.stringify(err));
          res.status(400).send(err);
        });
    });
});

app.post('/api/games/search', async (req, res) => {
  try {
    const { name, platform } = req.body;
    const where = {};

    if (name && name.trim() !== '') {
      where.name = {
        [Op.like]: `%${name}%`,
      };
    }

    if (platform && platform.trim() !== '') {
      where.platform = platform;
    }

    const games = await db.Game.findAll({
      where,
      order: [['name', 'ASC']],
    });

    res.json(games);
  } catch (error) {
    console.error('Failed to executed search on games:', error);
    res.status(500).json({ error: 'An error occurred during the search' });
  }
});

app.post('/api/games/populate', async (req, res) => {
  try {
    const androidUrl = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/android.top100.json';
    const iosUrl = 'https://interview-marketing-eng-dev.s3.eu-west-1.amazonaws.com/ios.top100.json';

    const [androidResponse, iosResponse] = await Promise.all([
      axios.get(androidUrl),
      axios.get(iosUrl),
    ]);

    const flattenAndroidData = Array.isArray(androidResponse.data[0]) ?
      androidResponse.data.flat() :
      androidResponse.data;

    const flattenIosData = Array.isArray(iosResponse.data[0]) ?
      iosResponse.data.flat() :
      iosResponse.data;

    const androidGames = flattenAndroidData.map((game) => ({
      name: game.name || 'Unknown',
      platform: 'android',
      publisherId: game.publisher_id || null,
      storeId: game.store_id || null,
      bundleId: game.bundle_id || null,
      appVersion: game.version || '1.0',
      isPublished: true,
    }));

    const iosGames = flattenIosData.map((game) => ({
      name: game.name || 'Unknown',
      platform: 'ios',
      publisherId: game.publisher_id || null,
      storeId: game.store_id || null,
      bundleId: game.bundle_id || null,
      appVersion: game.version || '1.0',
      isPublished: true,
    }));

    const allGames = [...androidGames, ...iosGames];
    let processedCount = 0;

    for (const game of allGames) {
      try {
        const existingGame = await db.Game.findOne({
          where: {
            name: game.name,
            platform: game.platform,
          },
        });

        if (existingGame) {
          await existingGame.update(game);
        } else {
          await db.Game.create(game);
        }

        processedCount++;
      } catch (ex) {
        console.error(`Error processing game ${game.name}:`, ex);
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${processedCount} out of ${allGames.length} games`,
      count: processedCount,
    });
  } catch (ex) {
    console.error('Error populating the database:', ex);
    res.status(500).json({
      success: false,
      error: 'Failed to populate database',
      details: ex.message,
    });
  }
});

app.listen(3000, () => {
  console.log('Server is up on port 3000');
});

module.exports = app;
