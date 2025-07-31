const axios = require('axios');
const jwt = require('jsonwebtoken');

exports.linkCaqhAccount = async (req, res) => {
  const { caqhUserID, caqhPassword } = req.body;
  
  try {
    const authResponse = await axios.post(`${process.env.CAQH_BASE_URL}auth`, {
      username: caqhUserID,
      password: caqhPassword,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'client_id': process.env.CAQH_CLIENT_ID,
        'client_secret': process.env.CAQH_CLIENT_SECRET
      }
    });

    if (authResponse.status === 200) {
      const caqhToken = authResponse.data.access_token;

      res.status(200).json({ msg: 'CAQH account linked successfully', token: caqhToken });
    } else {
      res.status(400).json({ msg: 'Unable to link CAQH account' });
    }
  } catch (error) {
    console.error('Error linking CAQH account:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.caqhLogin = async (req, res) => {
  const { caqhUserID, caqhPassword } = req.body;

  try {
    const authResponse = await axios.post(`${process.env.CAQH_BASE_URL}auth`, {
      username: caqhUserID,
      password: caqhPassword,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'client_id': process.env.CAQH_CLIENT_ID,
        'client_secret': process.env.CAQH_CLIENT_SECRET
      }
    });

    if (authResponse.status === 200) {
      const caqhToken = authResponse.data.access_token;

      const token = jwt.sign({ caqhUserID }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.status(200).json({ msg: 'Login successful', token, caqhToken });
    } else {
      res.status(400).json({ msg: 'Invalid CAQH credentials' });
    }
  } catch (error) {
    console.error('CAQH login error:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};
