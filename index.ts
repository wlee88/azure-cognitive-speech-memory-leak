import { PassThrough } from "stream";
import {
    AudioConfig,
    AudioInputStream,
    ResultReason,
    SpeechConfig,
    SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";
import ffmpeg from "fluent-ffmpeg";

const CHANNELS = 1;
const MEMORY_USAGE_INTERVAL_MS = 15_000;
const VERBOSE = false;
const AUDIO_FILE = "navy_all8.aac";
const LOAD_MULTIPLIER = 1

const { AZURE_REGION: region, AZURE_KEY: key } = process.env;
if (!region || !key) {
    console.error("Expected environment variables AZURE_REGION and AZURE_KEY to be defined");
    process.exit(1);
}

for (let channel = 0; channel < CHANNELS * LOAD_MULTIPLIER; channel++) {
    // set up cognitive services
    const pushStream = AudioInputStream.createPushStream();
    const audioConfig = AudioConfig.fromStreamInput(pushStream);
    const speechConfig = SpeechConfig.fromSubscription(key, region);
    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    // set up a fake 'live-stream' simulation, and extract a channel
    const wavStream = new PassThrough();
    ffmpeg(AUDIO_FILE)
        .inputOptions(["-re", "-stream_loop -1"])
        .outputOptions([
            "-hide_banner",
            `-map_channel 0.0.${(channel % CHANNELS) + 1}:0.0?`,
            "-map 0:a",
            `-ar 16000`,
            "-ac 1",
            "-acodec pcm_s16le",
            "-f wav",
        ])
        .output(wavStream, { end: true })
        .run();
    wavStream.on("data", (d: Buffer) => {
        pushStream.write(d.slice());
    });

    // handle results
    recognizer.recognized = (_s, event) => {
        if (VERBOSE) {
          console.debug(`(recognized)  Reason: ${ResultReason[event.result.reason]} Text: ${event.result.text}`);
        }
    };
    recognizer.canceled = () => {
        console.error(`Channel ${channel} cancelled`);
    };

    // start!
    recognizer.startContinuousRecognitionAsync();
    console.log(`Channel ${channel} started`);
}

function outputMemory() {
    const { rss } = process.memoryUsage();
    console.log("Used megabytes:", rss / 1024 / 1024);
}

outputMemory();
setInterval(() => outputMemory(), MEMORY_USAGE_INTERVAL_MS);
