# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   add --clear to clear cache

3. To setup for android physical device

   Pre-requisite: 
   1. Android Studio & SDKs installed
   2. Connect to Android device
   3. Enable "Developer Options" and "USB Debugging"

   Steps: 

   1. Run & note the device ID 
      ```bash
      adb devices
      ```
   2. Run this for all the devices that you wish to launch an instance of the app
      ```bash
      adb -s <device-id> install> path/to/apk/on/pc
      ```
   3. After installation on Android device, run
      ```Bash
      npx expo start
      ```
   4. After seeing the launched expo on terminal, press <i>'a'</i> to start and instance of the test app on Android device. Press <i>Shift + 'a'</i> to select the device that you would like to launch the instance on.