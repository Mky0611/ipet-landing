document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // --- MOBILE NAV DRAWER ---
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  
  if (mobileMenuBtn && mobileNavDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileNavDrawer.style.height === '320px';
      mobileNavDrawer.style.height = isOpen ? '0' : '320px';
      
      // Update menu icon
      const icon = mobileMenuBtn.querySelector('i');
      if (icon) {
        if (isOpen) {
          icon.setAttribute('data-lucide', 'menu');
        } else {
          icon.setAttribute('data-lucide', 'x');
        }
        lucide.createIcons();
      }
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileNavDrawer.style.height = '0';
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
          icon.setAttribute('data-lucide', 'menu');
          lucide.createIcons();
        }
      });
    });
  }

  // --- FLOATING PARTICLES BACKGROUND (CANVAS) ---
  const canvas = document.getElementById('particles-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 100 };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        // Color palette (soft blue/purple glows)
        const isPurple = Math.random() > 0.6;
        this.color = isPurple ? 'rgba(189, 0, 255, 0.4)' : 'rgba(0, 240, 255, 0.4)';
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce on borders
        if (this.x > canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > canvas.height || this.y < 0) this.speedY = -this.speedY;

        // Interaction with mouse pointer
        if (mouse.x != null && mouse.y != null) {
          let dx = mouse.x - this.x;
          let dy = mouse.y - this.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius;
            // Push away
            this.x -= dx / distance * force * 2;
            this.y -= dy / distance * force * 2;
          }
        }
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const count = Math.min(window.innerWidth / 15, 80);
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };
    initParticles();

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }

  // --- ROBOT SVG EMOTION CONFIGS ---
  const eyeLeft = document.getElementById('eye-left');
  const eyeRight = document.getElementById('eye-right');
  const pupilLeft = document.getElementById('pupil-left');
  const pupilRight = document.getElementById('pupil-right');
  const blushLeft = document.getElementById('blush-left');
  const blushRight = document.getElementById('blush-right');
  const currentEmotionLabel = document.getElementById('current-emotion-label');
  const robotHead = document.getElementById('robot-head-group');
  const earLeft = document.getElementById('robot-ear-left');
  const earRight = document.getElementById('robot-ear-right');
  const collarRing = document.getElementById('collar-ring');

  const emotions = {
    curious: {
      pathLeft: 'M -16,-16 L 16,-16 C 22,-16 22,16 16,16 L -16,16 C -22,16 -22,-16 -16,-16 Z',
      pathRight: 'M -16,-16 L 16,-16 C 22,-16 22,16 16,16 L -16,16 C -22,16 -22,-16 -16,-16 Z',
      color: '#00f0ff',
      blush: 0,
      pupils: 0.6,
      collar: '#00f0ff'
    },
    happy: {
      pathLeft: 'M -16,6 C -16,6 0,-10 16,6 C 16,6 12,12 12,12 C 12,12 0,-4 -12,12 Z',
      pathRight: 'M -16,6 C -16,6 0,-10 16,6 C 16,6 12,12 12,12 C 12,12 0,-4 -12,12 Z',
      color: '#00f0ff',
      blush: 0.75,
      pupils: 0,
      collar: '#00f0ff'
    },
    love: {
      pathLeft: 'M 0,8 C -8,0 -12,-8 -6,-14 C -2,-18 0,-12 0,-12 C 0,-12 2,-18 6,-14 C 12,-8 8,0 0,8 Z',
      pathRight: 'M 0,8 C -8,0 -12,-8 -6,-14 C -2,-18 0,-12 0,-12 C 0,-12 2,-18 6,-14 C 12,-8 8,0 0,8 Z',
      color: '#ff007b',
      blush: 0.9,
      pupils: 0,
      collar: '#bd00ff'
    },
    thinking: {
      pathLeft: 'M -18,-3 L 18,-3 C 20,-3 20,3 18,3 L -18,3 C -20,3 -20,-3 -18,-3 Z',
      pathRight: 'M -18,-3 L 18,-3 C 20,-3 20,3 18,3 L -18,3 C -20,3 -20,-3 -18,-3 Z',
      color: '#bd00ff',
      blush: 0,
      pupils: 0,
      collar: '#bd00ff'
    },
    listening: {
      pathLeft: 'M -18,-2 L 18,-2 C 19,-2 19,2 18,2 L -18,2 C -19,2 -19,-2 -18,-2 Z',
      pathRight: 'M -18,-2 L 18,-2 C 19,-2 19,2 18,2 L -18,2 C -19,2 -19,-2 -18,-2 Z',
      color: '#00f0ff',
      blush: 0,
      pupils: 0,
      collar: '#00f0ff'
    },
    sleeping: {
      pathLeft: 'M -16,-6 C -16,-6 0,8 16,-6 C 16,-6 12,-11 12,-11 C 12,-11 0,2 -12,-11 Z',
      pathRight: 'M -16,-6 C -16,-6 0,8 16,-6 C 16,-6 12,-11 12,-11 C 12,-11 0,2 -12,-11 Z',
      color: '#1a4e6e',
      blush: 0,
      pupils: 0,
      collar: 'rgba(255,255,255,0.1)'
    }
  };

  let activeEmotion = 'curious';

  const setRobotEmotion = (emotionName) => {
    const config = emotions[emotionName];
    if (!config) return;

    activeEmotion = emotionName;

    // Morph path shapes
    eyeLeft.setAttribute('d', config.pathLeft);
    eyeRight.setAttribute('d', config.pathRight);

    // Apply color and glow
    eyeLeft.setAttribute('fill', config.color);
    eyeRight.setAttribute('fill', config.color);
    eyeLeft.style.filter = `drop-shadow(0 0 6px ${config.color})`;
    eyeRight.style.filter = `drop-shadow(0 0 6px ${config.color})`;

    // Hide/show pupils
    pupilLeft.setAttribute('opacity', config.pupils);
    pupilRight.setAttribute('opacity', config.pupils);

    // Blush cheeks glow
    blushLeft.style.opacity = config.blush;
    blushRight.style.opacity = config.blush;

    // Collar ring color
    collarRing.setAttribute('stroke', config.collar);
    collarRing.style.filter = `drop-shadow(0 0 4px ${config.collar})`;

    // Update text label
    if (currentEmotionLabel) {
      currentEmotionLabel.textContent = emotionName.charAt(0).toUpperCase() + emotionName.slice(1);
    }

    // Set twitch animations for ears on certain emotions
    if (earLeft && earRight) {
      if (emotionName === 'happy' || emotionName === 'love') {
        earLeft.style.transform = 'rotate(-8deg)';
        earRight.style.transform = 'rotate(8deg)';
      } else if (emotionName === 'sleeping') {
        earLeft.style.transform = 'rotate(4deg)';
        earRight.style.transform = 'rotate(-4deg)';
      } else {
        earLeft.style.transform = 'none';
        earRight.style.transform = 'none';
      }
    }

    // Toggle active state in Quick Controls panel
    document.querySelectorAll('.btn-face-mood').forEach(btn => {
      if (btn.getAttribute('data-emotion') === emotionName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  };

  // Bind Quick Emotion Selector buttons
  document.querySelectorAll('.btn-face-mood').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const emotionName = btn.getAttribute('data-emotion');
      setRobotEmotion(emotionName);
    });
  });

  // Periodical automatic blinking loop
  setInterval(() => {
    const robotContainer = document.querySelector('.robot-container');
    if (robotContainer && activeEmotion === 'curious') {
      robotContainer.classList.add('blinking');
      setTimeout(() => {
        robotContainer.classList.remove('blinking');
      }, 300);
    }
  }, 4500);

  // --- 3D PERSPECTIVE CARD TILT ---
  const robot3dCard = document.getElementById('robot-3d-card');
  const cardGlow = robot3dCard?.querySelector('.robot-card-glow');
  const cardOuter = robot3dCard?.querySelector('.robot-card');

  if (robot3dCard && cardOuter) {
    robot3dCard.addEventListener('mousemove', (e) => {
      const rect = robot3dCard.getBoundingClientRect();
      const x = e.clientX - rect.left; // x coordinate inside element
      const y = e.clientY - rect.top;  // y coordinate inside element
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Card tilting angles (clamped to max 12 deg)
      const rotateY = ((x - centerX) / centerX) * 12;
      const rotateX = -((y - centerY) / centerY) * 12;

      cardOuter.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      
      // Shift glow behind slightly in opposite direction
      if (cardGlow) {
        const glowX = -((x - centerX) / centerX) * 20;
        const glowY = -((y - centerY) / centerY) * 20;
        cardGlow.style.transform = `translate(${glowX}px, ${glowY}px)`;
        cardGlow.style.opacity = '0.15';
      }

      // Parallax effect on robot head group (translate slightly inside SVG)
      if (robotHead) {
        const headX = ((x - centerX) / centerX) * 14;
        const headY = ((y - centerY) / centerY) * 10;
        robotHead.style.transform = `translate(${headX}px, ${headY}px)`;
      }

      // Eye pupil shift (gives look of tracking)
      const eyeLCont = document.getElementById('eye-left-container');
      const eyeRCont = document.getElementById('eye-right-container');
      if (eyeLCont && eyeRCont && activeEmotion === 'curious') {
        const pupilX = ((x - centerX) / centerX) * 6;
        const pupilY = ((y - centerY) / centerY) * 5;
        eyeLCont.style.transform = `translate(${170 + pupilX}px, ${190 + pupilY}px)`;
        eyeRCont.style.transform = `translate(${230 + pupilX}px, ${190 + pupilY}px)`;
      }
    });

    robot3dCard.addEventListener('mouseleave', () => {
      // Reset card and nested coordinates
      cardOuter.style.transition = 'transform 0.5s ease';
      cardOuter.style.transform = 'rotateX(0deg) rotateY(0deg)';
      
      if (cardGlow) {
        cardGlow.style.transition = 'transform 0.5s ease, opacity 0.5s ease';
        cardGlow.style.transform = 'translate(0, 0)';
        cardGlow.style.opacity = '0.1';
      }

      if (robotHead) {
        robotHead.style.transition = 'transform 0.5s ease';
        robotHead.style.transform = 'translate(0, 0)';
      }

      const eyeLCont = document.getElementById('eye-left-container');
      const eyeRCont = document.getElementById('eye-right-container');
      if (eyeLCont && eyeRCont) {
        eyeLCont.style.transition = 'transform 0.5s ease';
        eyeRCont.style.transition = 'transform 0.5s ease';
        eyeLCont.style.transform = 'translate(170px, 190px)';
        eyeRCont.style.transform = 'translate(230px, 190px)';
      }

      // Remove transition styles after they settle
      setTimeout(() => {
        cardOuter.style.transition = 'none';
        if (cardGlow) cardGlow.style.transition = 'none';
        if (robotHead) robotHead.style.transition = 'none';
        if (eyeLCont) eyeLCont.style.transition = 'none';
        if (eyeRCont) eyeRCont.style.transition = 'none';
      }, 500);
    });
  }

  // --- TOUCH BLUEPRINT CAPACITIVE SENSORS ---
  const touchFeedbackBox = document.getElementById('touch-feedback-box');
  const sensorNodes = document.querySelectorAll('.sensor-node');

  const updateTouchFeedback = (text, isAlert = false) => {
    if (!touchFeedbackBox) return;
    touchFeedbackBox.querySelector('.log-text').textContent = text;
    if (isAlert) {
      touchFeedbackBox.classList.add('alert');
      touchFeedbackBox.querySelector('i').setAttribute('data-lucide', 'heart');
    } else {
      touchFeedbackBox.classList.remove('alert');
      touchFeedbackBox.querySelector('i').setAttribute('data-lucide', 'activity');
    }
    lucide.createIcons();
  };

  sensorNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const sensor = node.getAttribute('data-sensor');
      node.classList.add('active');
      
      if (sensor === 'head') {
        updateTouchFeedback('Capacitive sensor: Approaching head touch pad...');
      } else if (sensor.startsWith('cheek')) {
        updateTouchFeedback('Capacitive sensor: Approaching cheeks tickle sensors...');
      } else if (sensor === 'chest') {
        updateTouchFeedback('Infrared sensor: Approaching chest speaker module...');
      }
    });

    node.addEventListener('mouseleave', () => {
      node.classList.remove('active');
      updateTouchFeedback('System Standby. Pat or tickle the sensors.');
    });

    node.addEventListener('click', () => {
      const sensor = node.getAttribute('data-sensor');
      
      if (sensor === 'head') {
        updateTouchFeedback('Head sensor touched! iPet purrs and eyes shift to Happy.', true);
        setRobotEmotion('happy');
        
        // Twitch ears
        if (earLeft && earRight) {
          earLeft.style.transform = 'rotate(-12deg)';
          earRight.style.transform = 'rotate(12deg)';
          setTimeout(() => {
            earLeft.style.transform = 'none';
            earRight.style.transform = 'none';
          }, 1200);
        }
        
        // Reset after 3.5 seconds
        setTimeout(() => {
          if (activeEmotion === 'happy') setRobotEmotion('curious');
        }, 3500);

      } else if (sensor.startsWith('cheek')) {
        updateTouchFeedback('Cheek tickled! Blush matrix is activated.', true);
        setRobotEmotion('love');
        
        // Tilt head slightly
        if (robotHead) {
          robotHead.style.transform = sensor === 'cheek-l' ? 'rotate(-6deg)' : 'rotate(6deg)';
          setTimeout(() => {
            robotHead.style.transform = 'none';
          }, 1500);
        }

        setTimeout(() => {
          if (activeEmotion === 'love') setRobotEmotion('curious');
        }, 3500);

      } else if (sensor === 'chest') {
        updateTouchFeedback('Chest trigger check! Voice sound waves activated.');
        setRobotEmotion('listening');
        
        // Trigger simulated soundwave
        const soundwave = document.getElementById('terminal-soundwave');
        if (soundwave) {
          soundwave.classList.add('active');
          setTimeout(() => {
            soundwave.classList.remove('active');
            if (activeEmotion === 'listening') setRobotEmotion('curious');
          }, 2500);
        }
      }
    });
  });

  // --- EDGE VOICE TERMINAL CHAT SIMULATION ---
  const chatMessages = document.getElementById('chat-messages');
  const promptButtons = document.querySelectorAll('.btn-prompt');
  const terminalSoundwave = document.getElementById('terminal-soundwave');

  const botResponses = {
    love: {
      text: "*Purrs* I love you 3000! My emotional coefficient matrix is spiking right now!",
      emotion: 'love'
    },
    joke: {
      text: "Why did the AI robot go to school? To improve its micro-chips! Beep-boop.",
      emotion: 'happy'
    },
    sleep: {
      text: "Yawn... Entering battery preservation sleep. Goodnight, human!",
      emotion: 'sleeping'
    },
    dance: {
      text: "Scanning cyber-beats frequency. Activating physical twitches and ear dance protocol!",
      emotion: 'listening'
    }
  };

  const addChatBubble = (sender, text, isBot = false) => {
    if (!chatMessages) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isBot ? 'bot' : 'user'}`;

    const senderDiv = document.createElement('div');
    senderDiv.className = 'bubble-sender';
    senderDiv.innerHTML = isBot ? '<i data-lucide="bot"></i> iPet' : '<i data-lucide="user"></i> You';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bubble-content';
    contentDiv.textContent = text;

    bubble.appendChild(senderDiv);
    bubble.appendChild(contentDiv);
    chatMessages.appendChild(bubble);
    
    // Auto-scroll
    chatMessages.scrollTop = chatMessages.scrollHeight;
    lucide.createIcons();
  };

  promptButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Disable buttons temporarily during response
      promptButtons.forEach(b => b.setAttribute('disabled', 'true'));

      const promptType = btn.getAttribute('data-prompt');
      const userText = btn.textContent.trim();
      
      // 1. User Message
      addChatBubble('User', userText, false);

      // 2. Play Soundwave & change robot to listening
      if (terminalSoundwave) terminalSoundwave.classList.add('active');
      setRobotEmotion('listening');

      // 3. Robot responds after delay
      setTimeout(() => {
        if (terminalSoundwave) terminalSoundwave.classList.remove('active');
        
        const responseObj = botResponses[promptType];
        if (responseObj) {
          addChatBubble('iPet', responseObj.text, true);
          setRobotEmotion(responseObj.emotion);

          // Custom physical animations for dance prompt
          if (promptType === 'dance' && earLeft && earRight) {
            let danceCounter = 0;
            const danceInterval = setInterval(() => {
              earLeft.style.transform = danceCounter % 2 === 0 ? 'rotate(-12deg)' : 'rotate(10deg)';
              earRight.style.transform = danceCounter % 2 === 0 ? 'rotate(10deg)' : 'rotate(-12deg)';
              if (robotHead) {
                robotHead.style.transform = danceCounter % 2 === 0 ? 'rotate(-4deg)' : 'rotate(4deg)';
              }
              danceCounter++;
              if (danceCounter > 8) {
                clearInterval(danceInterval);
                earLeft.style.transform = 'none';
                earRight.style.transform = 'none';
                if (robotHead) robotHead.style.transform = 'none';
                setRobotEmotion('curious');
              }
            }, 300);
          }
        }

        // Re-enable prompt buttons
        promptButtons.forEach(b => b.removeAttribute('disabled'));
      }, 1800);
    });
  });

  // --- EMOTIONAL AI DASHBOARD ---
  // Initial coefficient states
  let affection = 65;
  let energy = 40;
  let curiosity = 80;
  let joy = 70;

  const updateSliders = () => {
    // Clamp values between 0 and 100
    affection = Math.max(0, Math.min(100, affection));
    energy = Math.max(0, Math.min(100, energy));
    curiosity = Math.max(0, Math.min(100, curiosity));
    joy = Math.max(0, Math.min(100, joy));

    // Update Slider widths
    document.getElementById('fill-affection').style.width = `${affection}%`;
    document.getElementById('fill-energy').style.width = `${energy}%`;
    document.getElementById('fill-curiosity').style.width = `${curiosity}%`;
    document.getElementById('fill-joy').style.width = `${joy}%`;

    // Update Slider text content
    document.getElementById('val-affection').textContent = `${affection}%`;
    document.getElementById('val-energy').textContent = `${energy}%`;
    document.getElementById('val-curiosity').textContent = `${curiosity}%`;
    document.getElementById('val-joy').textContent = `${joy}%`;
  };

  // Action Buttons
  const btnPet = document.getElementById('btn-care-pet');
  const btnFeed = document.getElementById('btn-care-feed');
  const btnCharge = document.getElementById('btn-care-charge');
  const btnPlay = document.getElementById('btn-care-play');

  if (btnPet) {
    btnPet.addEventListener('click', () => {
      affection += 10;
      joy += 10;
      energy -= 5;
      updateSliders();
      setRobotEmotion(affection > 80 ? 'love' : 'happy');
      
      // Temporary blush cheek pulses
      if (blushLeft && blushRight) {
        blushLeft.style.opacity = '0.9';
        blushRight.style.opacity = '0.9';
        setTimeout(() => {
          if (activeEmotion !== 'love') {
            blushLeft.style.opacity = '0';
            blushRight.style.opacity = '0';
          }
        }, 2000);
      }
    });
  }

  if (btnFeed) {
    btnFeed.addEventListener('click', () => {
      joy += 15;
      energy += 10;
      updateSliders();
      setRobotEmotion('happy');
    });
  }

  if (btnCharge) {
    btnCharge.addEventListener('click', () => {
      energy += 40;
      curiosity -= 10;
      updateSliders();
      setRobotEmotion('sleeping');
      
      // Keep sleeping for 4 seconds representing a charging state
      setTimeout(() => {
        if (activeEmotion === 'sleeping') setRobotEmotion('curious');
      }, 4000);
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      curiosity += 15;
      joy += 10;
      energy -= 20;
      updateSliders();
      setRobotEmotion('listening');
      
      // Ear twitches
      if (earLeft && earRight) {
        earLeft.style.transform = 'rotate(-8deg)';
        earRight.style.transform = 'rotate(8deg)';
        setTimeout(() => {
          earLeft.style.transform = 'none';
          earRight.style.transform = 'none';
          if (activeEmotion === 'listening') setRobotEmotion('curious');
        }, 2000);
      }
    });
  }

  // --- BILLING INTERVAL SWITCH (PRICING) ---
  const billingBtn = document.getElementById('billing-cycle-btn');
  const labelMonthly = document.getElementById('label-monthly');
  const labelYearly = document.getElementById('label-yearly');

  const priceCore = document.getElementById('price-core');
  const pricePro = document.getElementById('price-pro');
  const priceCyber = document.getElementById('price-cyber');
  
  const periodCore = document.getElementById('period-core');
  const periodPro = document.getElementById('period-pro');
  const periodCyber = document.getElementById('period-cyber');

  if (billingBtn) {
    billingBtn.addEventListener('click', () => {
      const isYearly = billingBtn.classList.toggle('yearly');
      
      if (isYearly) {
        labelMonthly.classList.remove('active');
        labelYearly.classList.add('active');
        
        // Update prices (simulate a 20% discount on yearly bundle checkout options)
        priceCore.textContent = '199';
        pricePro.textContent = '299';
        priceCyber.textContent = '399';
        
        periodCore.textContent = ' / promo rate';
        periodPro.textContent = ' / promo rate';
        periodCyber.textContent = ' / promo rate';

        // Add bounce animations to price elements
        [priceCore, pricePro, priceCyber].forEach(el => {
          el.style.transform = 'scale(1.1)';
          setTimeout(() => el.style.transform = 'none', 300);
        });
      } else {
        labelMonthly.classList.add('active');
        labelYearly.classList.remove('active');
        
        priceCore.textContent = '249';
        pricePro.textContent = '379';
        priceCyber.textContent = '499';

        periodCore.textContent = '/one-off';
        periodPro.textContent = '/one-off';
        periodCyber.textContent = '/one-off';

        [priceCore, pricePro, priceCyber].forEach(el => {
          el.style.transform = 'scale(0.95)';
          setTimeout(() => el.style.transform = 'none', 300);
        });
      }
    });
  }

  // --- INTERSECTION OBSERVER SCROLL REVEALS ---
  const revealElements = document.querySelectorAll('.scroll-reveal');
  
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // Reveal once
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before element fits fully
    });

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });
  }

  // Initial setup call
  updateSliders();
});
