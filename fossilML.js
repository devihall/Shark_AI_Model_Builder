// JavaScript logic for survey completion and tab navigation

// Add an event listener to the iframe for form submission
document.getElementById("survey-iframe").addEventListener("load", function () {
  // Assuming the form submission will redirect to a specific URL
  let surveyIframe = document.getElementById("survey-iframe");
  surveyIframe.contentWindow.addEventListener("beforeunload", function () {
    // Enable the Evaluate tab
    enableEvaluateTab();
  });
});

// Function to enable the Evaluate tab
function enableEvaluateTab() {
  let evaluateTabButton = document.querySelector(".evaluate-tab");
  evaluateTabButton.disabled = false;
  evaluateTabButton.classList.add("active");
}

// Function to disable the Evaluate tab
function disableEvaluateTab() {
  let evaluateTabButton = document.querySelector(".evaluate-tab");
  evaluateTabButton.disabled = true;
  evaluateTabButton.classList.remove("active");
}

// Function to open tabs
function openTab(tabName) {
  // Hide all tabs
  var tabs = document.getElementsByClassName("tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove("active");
  }

  // Deactivate all tab buttons
  var tabButtons = document.getElementsByClassName("tab-button");
  for (var i = 0; i < tabButtons.length; i++) {
    tabButtons[i].classList.remove("active");
  }

  // Show the selected tab
  document.getElementById(tabName).classList.add("active");

  // Activate the selected tab button
  document
    .querySelector("[onclick*='" + tabName + "']")
    .classList.add("active");
}

////////////////////////////////////
//// logic for model training

// Initialize the MobileNet model
let myimages = [];
let img;
let currentIndex = 0;
let allImages = [];
let predictions = [];
// Initialize an array to store loss values
let lossData = [];
let trainingResults;
let loss;
let epoch;
let surface;
let inputText;

const myfeatureExtractor = ml5.featureExtractor("MobileNet", modelReady);
const myClassifier = myfeatureExtractor.classification();

console.log("myimages", myimages);

// Function to handle model loading
function modelReady() {
  console.log("Model is ready");
}

///////
function saveText() {
  // Get the value from the input field
  // inputText = document.getElementById("textInput").value;

  // Do something with the inputText variable
  console.log("Input Text:", inputText);
  // You can assign this value to any other variable or perform further operations.
}
//////

// Function to handle training image files input
// Function to handle training image files input
async function handleFileInput(inputId, categoryId, thumbnailContainerId) {
  const input = document.getElementById(inputId);
  const categoryInput = document.getElementById(categoryId);
  const thumbnailContainer = document.getElementById(thumbnailContainerId);

  if (!input || !categoryInput || !thumbnailContainer) {
    console.error("Input element not found");
    return;
  }

  const numFiles = input.files.length;
  if (numFiles < 2) {
    // Show bootstrap alert
    // ...
    return;
  }

  const promises = [];
  let currentRow;

  for (let i = 0; i < input.files.length; i++) {
    const file = input.files[i];
    const img = document.createElement("img");
    img.width = 100;
    img.height = 100;
    img.src = URL.createObjectURL(file);

    const thumbnailDiv = document.createElement("div");
    thumbnailDiv.classList.add(
      "col-lg-4",
      "col-md-4",
      "col-sm-12",
      "border",
      "p-3",
      "wrapper"
    );
    thumbnailDiv.appendChild(img);

    // Check if a new row needs to be created
    if (i % 3 === 0) {
      console.log("new row function");
      currentRow = document.createElement("div");
      currentRow.classList.add("row");
      thumbnailContainer.appendChild(currentRow);
    }

    currentRow.appendChild(thumbnailDiv);

    myimages.push(img);

    let category = categoryInput.value;

    promises.push(myClassifier.addImage(img, category));
  }

  await Promise.all(promises);

  // Continue with training logic...
}
async function training() {
  console.log("model is training");
  document
    .getElementById("startTrainingBtn")
    .addEventListener("click", async function () {
      alert("Training started!");
      // Add your custom logic here
      console.log("Start Training button clicked");
      // You can also trigger other actions, such as starting a training process, making an API call, etc.
      //  myClassifier.train(whileTraining);
      await myClassifier.train((lossValue) => {
        console.log("Loss is", lossValue);
        if (lossValue == null) {
          whileTraining();
        }
      });
    });
}

async function whileTraining() {
  console.log("model is training");

  // Display "Model is training" message
  const trainingMessageContainer = document.getElementById("trainingMessage");
  trainingMessageContainer.innerHTML = `
        <div class="alert alert-info" role="alert">
            Model is done training. Check the Evaluate tabe for model performance.
        </div>`;
}

// logic for classifying images
///////////////////////////////////
function readURL(input) {
  console.log("choose image clicked");
  if (input.files && input.files[0]) {
    $("#classify").prop("disabled", false);
    var reader = new FileReader();

    reader.onload = function (e) {
      $("#image").attr("src", e.target.result);
    };

    reader.readAsDataURL(input.files[0]);
  }
}

/////////////////////////////////////////////////////
// logic for image classification with retrained model
function classify() {
  console.log("classify button clicked");
  $("#classify").prop("disabled", true);

  const element = $("#result");
  element.html("Detecting...").addClass("border");

  // Clear the content of the result div
  element.empty();

  // Initialize Image Classifier with MobileNet.
  const img = document.getElementById("image");
  myClassifier.classify(img, gotResult);

  // Move the #result div below the "Choose Image" and "Classify" button
  const resultContainer = $(".buttonList");
  const existingElement = $(".result-container");
  if (existingElement.length === 0) {
    resultContainer.after(
      '<div class="result-container p-2 mt-3" style="width: 300px;"></div>'
    );
  }
  resultContainer.parent().find(".result-container").html(element);

  // Function to run when results arrive
  function gotResult(error, results) {
    console.log("in gotResult function");
    if (error) {
      console.log(error);
      const errorMessage = $(
        "<div class='alert alert-danger alert-dismissible fade show' role='alert'>" +
          "Train the model before using the classifier" +
          "<button type='button' class='btn-close' data-bs-dismiss='alert' aria-label='Close'></button>" +
          "</div>"
      );
      $("#classifierMessage").append(errorMessage);
      element.html("classifier not ready!");
      setTimeout(() => {
        errorMessage.remove();
        element.remove();
      }, 3000); // Remove after 5 seconds (adjust as needed
    } else {
      console.log(results);

      let num = results[0].confidence * 100;
      element.html(
        "<h5> Shark AI classifier is " +
          num.toFixed(2) +
          "% sure your test image belongs to " +
          results[0].label +
          "</h5>"
      );
    }
  }
}
