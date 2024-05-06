const STATUS = document.getElementById("status");
const RESET_BUTTON = document.getElementById("reset");
const TRAIN_BUTTON = document.getElementById("train");
const MOBILE_NET_INPUT_WIDTH = 224;
const MOBILE_NET_INPUT_HEIGHT = 224;
const STOP_DATA_GATHER = -1;
const CLASS_NAMES = [];

TRAIN_BUTTON.addEventListener("click", trainAndPredict);
RESET_BUTTON.addEventListener("click", reset);

let dataCollectorButtons = document.querySelectorAll("button.dataCollector");
for (let i = 0; i < dataCollectorButtons.length; i++) {
  dataCollectorButtons[i].addEventListener("click", gatherDataForClass);
  CLASS_NAMES.push(dataCollectorButtons[i].getAttribute("data-name"));
}

let mobilenet = undefined;
let gatherDataState = STOP_DATA_GATHER;
let trainingDataInputs = [];
let trainingDataOutputs = [];
let examplesCount = [];
let predict = false;

async function loadMobileNetFeatureModel() {
  const URL =
    "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1";
  mobilenet = await tf.loadGraphModel(URL, { fromTFHub: true });
  STATUS.innerText = "MobileNet v3 loaded successfully!";

  tf.tidy(function () {
    let answer = mobilenet.predict(
      tf.zeros([1, MOBILE_NET_INPUT_HEIGHT, MOBILE_NET_INPUT_WIDTH, 3])
    );
    console.log(answer.shape);
  });
}

loadMobileNetFeatureModel();

let model = tf.sequential();
model.add(
  tf.layers.dense({ inputShape: [1024], units: 128, activation: "relu" })
);
model.add(
  tf.layers.dense({ units: CLASS_NAMES.length, activation: "softmax" })
);

model.summary();

model.compile({
  optimizer: "adam",
  loss:
    CLASS_NAMES.length === 2 ? "binaryCrossentropy" : "categoricalCrossentropy",
  metrics: ["accuracy"],
});

function gatherDataForClass() {
  let classNumber = parseInt(this.getAttribute("data-1hot"));
  gatherDataState =
    gatherDataState === STOP_DATA_GATHER ? classNumber : STOP_DATA_GATHER;
  if (gatherDataState !== STOP_DATA_GATHER) {
    document.getElementById("fileInput").click(); // Trigger file input dialog
  }
}

document
  .getElementById("fileInput")
  .addEventListener("change", async function (event) {
    const files = event.target.files;
    if (files.length > 0) {
      for (const file of files) {
        const imageTensor = await loadImageAsTensor(file);
        const imageFeatures = await calculateFeatures(imageTensor);

        trainingDataInputs.push(imageFeatures);
        trainingDataOutputs.push(gatherDataState);

        if (examplesCount[gatherDataState] === undefined) {
          examplesCount[gatherDataState] = 0;
        }
        examplesCount[gatherDataState]++;

        STATUS.innerText = "";
        for (let n = 0; n < CLASS_NAMES.length; n++) {
          STATUS.innerText +=
            CLASS_NAMES[n] + " data count: " + examplesCount[n] + ". ";
        }
      }
    }
  });

async function loadImageAsTensor(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tensor = tf.browser
          .fromPixels(img)
          .resizeNearestNeighbor([
            MOBILE_NET_INPUT_HEIGHT,
            MOBILE_NET_INPUT_WIDTH,
          ])
          .toFloat();
        resolve(tensor.div(255));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function calculateFeatures(imageTensor) {
  return tf.tidy(() => {
    return mobilenet.predict(imageTensor.expandDims()).squeeze();
  });
}

async function trainAndPredict() {
  predict = false;
  tf.util.shuffleCombo(trainingDataInputs, trainingDataOutputs);

  let outputsAsTensor = tf.tensor1d(trainingDataOutputs, "int32");
  let oneHotOutputs = tf.oneHot(outputsAsTensor, CLASS_NAMES.length);
  let inputsAsTensor = tf.stack(trainingDataInputs);

  let results = await model.fit(inputsAsTensor, oneHotOutputs, {
    shuffle: true,
    batchSize: 5,
    epochs: 10,
    callbacks: { onEpochEnd: logProgress },
  });

  outputsAsTensor.dispose();
  oneHotOutputs.dispose();
  inputsAsTensor.dispose();

  predict = true;
  predictLoop();
}

function logProgress(epoch, logs) {
  console.log("Data for epoch " + epoch, logs);
}

function predictLoop() {
  if (predict) {
    tf.tidy(function () {
      // You can perform prediction loop here if needed
    });
    // window.requestAnimationFrame(predictLoop);
  }
}

function reset() {
  predict = false;
  examplesCount.splice(0);
  for (let i = 0; i < trainingDataInputs.length; i++) {
    trainingDataInputs[i].dispose();
  }
  trainingDataInputs.splice(0);
  trainingDataOutputs.splice(0);
  STATUS.innerText = "No data collected";

  console.log("Tensors in memory: " + tf.memory().numTensors);
}
