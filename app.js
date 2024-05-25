const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const nodemailer = require('nodemailer');
const { Weather } = require('./models');

const app = express();
app.use(bodyParser.json());

// Geocoding and weather API keys
const GEOCODING_API_KEY = 'your_geocoding_api_key';
const WEATHER_API_KEY = 'your_weather_api_key';

// POST /api/SaveWeatherMapping
app.post('/api/SaveWeatherMapping', async (req, res) => {
  const cities = req.body;
  try {
    for (const city of cities) {
      // Fetch coordinates
      const geoResponse = await axios.get(`https://api.api-ninjas.com/v1/geocoding?city=${city.city}&country=${city.country}`, {
        headers: { 'X-Api-Key': GEOCODING_API_KEY }
      });
      const geoData = geoResponse.data[0];
      const { latitude, longitude } = geoData;

      // Fetch weather
      const weatherResponse = await axios.get(`https://weatherapi-com.p.rapidapi.com/current.json?q=${latitude},${longitude}`, {
        headers: {
          'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
          'X-RapidAPI-Key': WEATHER_API_KEY
        }
      });
      const weatherData = weatherResponse.data;
      const weather = weatherData.current.condition.text;
      const time = new Date();

      // Save to database
      await Weather.create({
        city: city.city,
        country: city.country,
        weather,
        time,
        longitude,
        latitude
      });
    }
    res.status(200).send('Weather data saved successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while saving weather data.');
  }
});

// GET /api/weatherDashboard
app.get('/api/weatherDashboard', async (req, res) => {
  const city = req.query.city;
  try {
    if (city) {
      const weatherData = await Weather.findAll({ where: { city } });
      res.json(weatherData);
    } else {
      const latestWeather = await Weather.findAll({
        attributes: ['id', 'city', 'country', 'weather', 'time'],
        order: [['time', 'DESC']],
        group: ['city']
      });
      res.json(latestWeather);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while fetching weather data.');
  }
});

// POST /api/mailWeatherData
app.post('/api/mailWeatherData', async (req, res) => {
  const cities = req.body;
  try {
    let weatherData = [];

    if (cities.length > 0) {
      for (const city of cities) {
        const cityWeather = await Weather.findAll({ where: { city: city.city } });
        weatherData = weatherData.concat(cityWeather);
      }
    } else {
      weatherData = await Weather.findAll({
        attributes: ['id', 'city', 'country', 'weather', 'time'],
        order: [['time', 'DESC']],
        group: ['city']
      });
    }

    // Set up nodemailer
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',
        pass: 'your_email_password'
      }
    });

    // Prepare email content
    let emailContent = '<h1>Weather Data</h1><table border="1"><tr><th>ID</th><th>City</th><th>Country</th><th>Weather</th><th>Time</th></tr>';
    for (const data of weatherData) {
      emailContent += `<tr><td>${data.id}</td><td>${data.city}</td><td>${data.country}</td><td>${data.weather}</td><td>${data.time}</td></tr>`;
    }
    emailContent += '</table>';

    // Send email
    let mailOptions = {
      from: 'aanchalsingh67@gmail.com',
      to: 'gauravbhoi678@gmail.com',
      subject: 'Weather Data',
      html: emailContent
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send('Email sent successfully.');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while sending the email.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
