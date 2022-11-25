# Azure STT Memory Leak Test
The aim of this repository was to investigate if there was a memory leak with the basic usage of the azure STT provider.

The program simply:
- reads in an example text audio file from the file system, and loops it using ffmpeg
- pipes that data into an azure push stream and starts stt recognition (per channel)
- takes memory usage stats every 15s

To Run:
- ensure [FFMPEG](http://ffmpeg.org/) is installed on your system.
- run `yarn start` with the `AZURE_REGION` and `AZURE_KEY` environment variables set

Notes:
- we've provided an [8 channel audio sample](./navy_all8.aac) - where for each channel we start a new `SpeechRecognizer`.
- running FFMPEG without writing to the push stream shows no leaks - proving the leaks are solely in the `microsoft-cognitiveservices-speech-sdk` package. 
  - you can easily test this by commenting out L46(index.ts) - as this means nothing is written to the push stream.
- we've noticed the rate of the leak scales proportionally with the number of channels.
