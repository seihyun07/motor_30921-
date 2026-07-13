    const targetPwmInput = document.getElementById("targetPwm");
    const changeAmountInput = document.getElementById("changeAmount");
    const intervalInput = document.getElementById("interval");
    const maxRpmInput = document.getElementById("maxRpm");

    const targetPwmValue = document.getElementById("targetPwmValue");
    const changeAmountValue = document.getElementById("changeAmountValue");
    const intervalValue = document.getElementById("intervalValue");

    const rotor = document.getElementById("rotor");

    const currentPwmElement = document.getElementById("currentPwm");
    const dutyRatioElement = document.getElementById("dutyRatio");
    const rpmElement = document.getElementById("rpm");
    const motorStateElement = document.getElementById("motorState");

    const in1Element = document.getElementById("in1");
    const in2Element = document.getElementById("in2");

    const directionDisplay = document.getElementById("directionDisplay");
    const wave = document.getElementById("wave");
    const status = document.getElementById("status");
    const arduinoCode = document.getElementById("arduinoCode");

    const directionButtons =
      document.querySelectorAll(".direction-button");

    const algorithmSteps =
      document.querySelectorAll(".step");

    let direction = "forward";
    let currentPwm = 0;

    let motorTimer = null;
    let stepTimer = null;

    function limitPwm(pwmValue) {
      if (pwmValue > 255) {
        return 255;
      }

      if (pwmValue < 0) {
        return 0;
      }

      return Math.round(pwmValue);
    }

    function getDirectionInformation() {
      if (direction === "forward") {
        return {
          name: "정회전",
          in1: "HIGH",
          in2: "LOW"
        };
      }

      if (direction === "backward") {
        return {
          name: "역회전",
          in1: "LOW",
          in2: "HIGH"
        };
      }

      return {
        name: "정지",
        in1: "LOW",
        in2: "LOW"
      };
    }

    function calculateRpm(pwmValue) {
      if (direction === "stop") {
        return 0;
      }

      const maxRpm = Number(maxRpmInput.value) || 1200;

      /*
        실제 DC 모터는 PWM 값이 너무 낮으면
        정지 마찰 때문에 회전하지 않을 수 있다.
      */
      const minimumStartPwm = 35;

      if (pwmValue < minimumStartPwm) {
        return 0;
      }

      const ratio =
        (pwmValue - minimumStartPwm) /
        (255 - minimumStartPwm);

      return Math.round(maxRpm * ratio);
    }

    function drawPwmWave(pwmValue) {
      const dutyRatio = pwmValue / 255;

      const width = 760;
      const highY = 20;
      const lowY = 100;

      const cycleCount = 5;
      const cycleWidth = width / cycleCount;

      const points = [];

      for (let i = 0; i < cycleCount; i++) {
        const startX = i * cycleWidth;
        const highEndX =
          startX + cycleWidth * dutyRatio;
        const endX = startX + cycleWidth;

        points.push(`${startX},${lowY}`);
        points.push(`${startX},${highY}`);
        points.push(`${highEndX},${highY}`);
        points.push(`${highEndX},${lowY}`);
        points.push(`${endX},${lowY}`);
      }

      wave.setAttribute("points", points.join(" "));
    }

    function updateArduinoCode(pwmValue) {
      let command;

      if (direction === "forward") {
        command = `rotateForward(${pwmValue});`;
      } else if (direction === "backward") {
        command = `rotateBackward(${pwmValue});`;
      } else {
        command = "stopMotor();";
      }

      arduinoCode.textContent =
`const int PWM_PIN = 9;
const int IN1_PIN = 7;
const int IN2_PIN = 8;

int limitPwm(int pwmValue) {
    if (pwmValue > 255) {
        return 255;
    }

    if (pwmValue < 0) {
        return 0;
    }

    return pwmValue;
}

void rotateForward(int pwmValue) {
    pwmValue = limitPwm(pwmValue);

    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
    analogWrite(PWM_PIN, pwmValue);
}

void rotateBackward(int pwmValue) {
    pwmValue = limitPwm(pwmValue);

    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, HIGH);
    analogWrite(PWM_PIN, pwmValue);
}

void stopMotor() {
    analogWrite(PWM_PIN, 0);

    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, LOW);
}

void loop() {
    ${command}
}`;
    }

    function updateMotor(pwmValue) {
      currentPwm = limitPwm(pwmValue);

      const directionInformation =
        getDirectionInformation();

      const dutyRatio =
        currentPwm / 255 * 100;

      const rpm =
        calculateRpm(currentPwm);

      currentPwmElement.textContent =
        currentPwm;

      dutyRatioElement.textContent =
        `${dutyRatio.toFixed(1)}%`;

      rpmElement.textContent =
        rpm;

      in1Element.textContent =
        directionInformation.in1;

      in2Element.textContent =
        directionInformation.in2;

      directionDisplay.textContent =
        directionInformation.name;

      const isRunning =
        rpm > 0 && direction !== "stop";

      motorStateElement.textContent =
        isRunning
          ? directionInformation.name
          : "정지";

      if (isRunning) {
        rotor.style.animationPlayState = "running";

        if (direction === "forward") {
          rotor.style.animationName =
            "rotateForward";
        } else {
          rotor.style.animationName =
            "rotateBackward";
        }

        /*
          PWM 값이 높을수록
          animation-duration이 작아져 빠르게 회전한다.
        */
        const duration =
          2.2 - currentPwm / 255 * 1.95;

        rotor.style.animationDuration =
          `${Math.max(0.18, duration)}s`;
      } else {
        rotor.style.animationPlayState =
          "paused";
      }

      drawPwmWave(currentPwm);
      updateArduinoCode(currentPwm);
    }

    function showAlgorithmSteps() {
      clearInterval(stepTimer);

      let index = 0;

      algorithmSteps.forEach(step => {
        step.classList.remove("active");
      });

      algorithmSteps[index]
        .classList.add("active");

      stepTimer = setInterval(() => {
        algorithmSteps[index]
          .classList.remove("active");

        index++;

        if (index >= algorithmSteps.length) {
          clearInterval(stepTimer);
          return;
        }

        algorithmSteps[index]
          .classList.add("active");
      }, 350);
    }

    function runMotorSimulation() {
      clearInterval(motorTimer);

      const originalTarget =
        Number(targetPwmInput.value);

      const target =
        limitPwm(originalTarget);

      const changeAmount =
        Math.max(
          1,
          Number(changeAmountInput.value)
        );

      const interval =
        Math.max(
          10,
          Number(intervalInput.value)
        );

      showAlgorithmSteps();

      if (direction === "stop") {
        updateMotor(0);

        status.textContent =
          "정지 명령이 선택되어 PWM을 0으로 설정했습니다.";

        return;
      }

      if (originalTarget !== target) {
        status.textContent =
          `입력값 ${originalTarget}은 범위를 벗어나 ${target}으로 제한되었습니다.`;
      } else {
        status.textContent =
          `PWM 값을 ${changeAmount}씩 변경하여 목표값 ${target}까지 이동합니다.`;
      }

      motorTimer = setInterval(() => {
        if (currentPwm < target) {
          currentPwm += changeAmount;

          if (currentPwm > target) {
            currentPwm = target;
          }
        } else if (currentPwm > target) {
          currentPwm -= changeAmount;

          if (currentPwm < target) {
            currentPwm = target;
          }
        }

        updateMotor(currentPwm);

        if (currentPwm === target) {
          clearInterval(motorTimer);

          const directionInformation =
            getDirectionInformation();

          status.textContent =
            `${directionInformation.name} 제어 완료: PWM ${currentPwm}, 듀티비 ${(currentPwm / 255 * 100).toFixed(1)}%`;
        }
      }, interval);
    }

    function stopMotorImmediately() {
      clearInterval(motorTimer);

      direction = "stop";

      directionButtons.forEach(button => {
        button.classList.toggle(
          "active",
          button.dataset.direction === "stop"
        );
      });

      updateMotor(0);
      showAlgorithmSteps();

      status.textContent =
        "즉시 정지 명령을 실행했습니다.";
    }

    directionButtons.forEach(button => {
      button.addEventListener("click", () => {
        direction =
          button.dataset.direction;

        directionButtons.forEach(otherButton => {
          otherButton.classList.toggle(
            "active",
            otherButton === button
          );
        });

        if (direction === "stop") {
          updateMotor(0);
        } else {
          updateMotor(currentPwm);
        }

        status.textContent =
          `${getDirectionInformation().name}이 선택되었습니다.`;
      });
    });

    targetPwmInput.addEventListener(
      "input",
      () => {
        targetPwmValue.textContent =
          targetPwmInput.value;

        updateArduinoCode(
          limitPwm(
            Number(targetPwmInput.value)
          )
        );
      }
    );

    changeAmountInput.addEventListener(
      "input",
      () => {
        changeAmountValue.textContent =
          changeAmountInput.value;
      }
    );

    intervalInput.addEventListener(
      "input",
      () => {
        intervalValue.textContent =
          `${intervalInput.value}ms`;
      }
    );

    maxRpmInput.addEventListener(
      "input",
      () => {
        updateMotor(currentPwm);
      }
    );

    document
      .getElementById("runButton")
      .addEventListener(
        "click",
        runMotorSimulation
      );

    document
      .getElementById("stopButton")
      .addEventListener(
        "click",
        stopMotorImmediately
      );

    updateMotor(0);