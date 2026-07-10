import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '@iplayertv/core';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Default language
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  });

export default i18n;
