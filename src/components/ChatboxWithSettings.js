import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Chatbox from './chatbox';


const ChatboxWithSettings = ({ settingsEndpoint, ...rest }) => {
  const [settings, setSettings] = useState({});

  const settingsObj = {};

  const getSettings = async () => {
    if (!settingsEndpoint) {
      const props = {
        ...rest,
        enabled: true
      }

      return setSettings(props);
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

    if (!settingsObj.enabled) {
      settingsObj.enabled = false;
    }

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
