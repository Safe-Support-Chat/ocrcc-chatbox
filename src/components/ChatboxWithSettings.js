import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Chatbox from './chatbox';


const ChatboxWithSettings = ({ settingsEndpoint, ...rest }) => {
  const [settings, setSettings] = useState({});

  const settingsObj = {};

  const getSettings = async () => {
    if (!settingsEndpoint) {
      return null;
    }

    const res = await fetch(settingsEndpoint);
    const data = await res.json();
    const { fields } = data;

    Object.entries(fields).forEach(([k, v]) => {
      const [scope, key] = k.split('_');

      if (scope === 'web') {
        settingsObj[key] = v;
      }
    });

    console.log("settings", settingsObj)

    return setSettings(settingsObj);
  };

  useEffect(() => {
    getSettings();
  }, []);

  return (
    <Chatbox {...settings} {...rest} />
  );
};

ChatboxWithSettings.propTypes = {
  settingsEndpoint: PropTypes.string,
};

export default ChatboxWithSettings;
