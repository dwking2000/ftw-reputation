// Code by https://github.com/vasturiano/3d-force-graph
// Licensed under MIT license


import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AmbientLight,
  PointLight,
  DirectionalLight,
  Raycaster,
  Vector2,
  Color
} from 'three';

import ThreeTrackballControls from 'three-trackballcontrols';
import ThreeForceGraph from './three-forcegraph/index';

import accessorFn from 'accessor-fn';
import Kapsule from 'kapsule';

import linkKapsule from './kapsule-link.js';


const three = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
    WebGLRenderer,
    Scene,
    PerspectiveCamera,
    AmbientLight,
    PointLight,
    DirectionalLight,
    Raycaster,
    Vector2,
    Color
  };

//

const CAMERA_DISTANCE2NODES_FACTOR = 150;

//

// Expose config from forceGraph
const bindFG = linkKapsule('forceGraph', ThreeForceGraph);
const linkedFGProps = Object.assign(...[
  'jsonUrl',
  'graphData',
  'numDimensions',
  'nodeRelSize',
  'nodeId',
  'nodeVal',
  'nodeResolution',
  'nodeColor',
  'nodeAutoColorBy',
  'nodeOpacity',
  'nodeThreeObject',
  'linkSource',
  'linkTarget',
  'linkColor',
  'linkAutoColorBy',
  'linkOpacity',
  'forceEngine',
  'd3AlphaDecay',
  'd3VelocityDecay',
  'warmupTicks',
  'cooldownTicks',
  'cooldownTime'
].map(p => ({ [p]: bindFG.linkProp(p)})));
const linkedFGMethods = Object.assign(...[
  'd3Force'
].map(p => ({ [p]: bindFG.linkMethod(p)})));

//

export default Kapsule({

  props: {
    width: { default: window.innerWidth },
    height: { default: window.innerHeight },
    backgroundColor: {
      default: '#000011',
      onChange(bckgColor, state) { state.scene.background = new three.Color(bckgColor); },
      triggerUpdate: false
    },
    showNavInfo: { default: true },
    nodeLabel: { default: 'name', triggerUpdate: false },
    linkLabel: { default: 'name', triggerUpdate: false },
    linkHoverPrecision: { default: 1, triggerUpdate: false },
    enablePointerInteraction: { default: true, onChange(_, state) { state.onHover = null; }, triggerUpdate: false },
    onNodeClick: { default: () => {}, triggerUpdate: false },
    onNodeHover: { default: () => {}, triggerUpdate: false },
    onLinkClick: { default: () => {}, triggerUpdate: false },
    onLinkHover: { default: () => {}, triggerUpdate: false },
    ...linkedFGProps
  },

  aliases: { // Prop names supported for backwards compatibility
    nameField: 'nodeLabel',
    idField: 'nodeId',
    valField: 'nodeVal',
    colorField: 'nodeColor',
    autoColorBy: 'nodeAutoColorBy',
    linkSourceField: 'linkSource',
    linkTargetField: 'linkTarget',
    linkColorField: 'linkColor',
    lineOpacity: 'linkOpacity'
  },

  methods: {
    ...linkedFGMethods
  },

  stateInit: () => {
    let renderer = new three.WebGLRenderer({
      antialias: true
    });
    renderer.setPixelRatio(2)

    return {
      renderer: renderer,
      scene: new three.Scene(),
      camera: new three.PerspectiveCamera(),
      lastSetCameraZ: 0,
      forceGraph: new ThreeForceGraph()
    }
  },

  init: function(domNode, state) {
    // Wipe DOM
    domNode.innerHTML = '';

    // Add nav info section
    domNode.appendChild(state.navInfo = document.createElement('div'));
    state.navInfo.className = 'graph-nav-info';
    state.navInfo.innerHTML = "Rotate: LEFT-click + drag<br />Zoom: scroll/mousewheel<br />Pan: RIGHT-click + drag";

    // Add info space
    let infoElem;
    domNode.appendChild(infoElem = document.createElement('div'));
    infoElem.className = 'graph-info-msg';
    infoElem.innerHTML = '';
    state.forceGraph.onLoading(() => { infoElem.innerHTML = 'Loading...' });
    state.forceGraph.onFinishLoading(() => {
      infoElem.innerHTML = '';

      // re-aim camera, if still in default position (not user modified)
      if (state.camera.position.x === 0 && state.camera.position.y === 0 && state.camera.position.z === state.lastSetCameraZ) {
        state.camera.lookAt(state.forceGraph.position);
        state.lastSetCameraZ = state.camera.position.z = Math.cbrt(state.forceGraph.graphData().nodes.length) * CAMERA_DISTANCE2NODES_FACTOR;
      }
    });

    // Setup tooltip
    const toolTipElem = document.createElement('div');
    toolTipElem.classList.add('graph-tooltip');
    domNode.appendChild(toolTipElem);

    // Capture mouse coords on move
    const raycaster = new three.Raycaster();
    const mousePos = new three.Vector2();
    mousePos.x = -2; // Initialize off canvas
    mousePos.y = -2;
    domNode.addEventListener("mousemove", ev => {
      // update the mouse pos
      const offset = getOffset(domNode),
        relPos = {
          x: ev.pageX - offset.left,
          y: ev.pageY - offset.top
        };
      mousePos.x = (relPos.x / state.width) * 2 - 1;
      mousePos.y = -(relPos.y / state.height) * 2 + 1;

      // Move tooltip
      toolTipElem.style.top = (relPos.y - 40) + 'px';
      toolTipElem.style.left = (relPos.x - 20) + 'px';

      function getOffset(el) {
        const rect = el.getBoundingClientRect(),
          scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
          scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
      }
    }, false);

    // Handle click events on nodes
    domNode.addEventListener("click", ev => {
      if (state.hoverObj) {
        state[`on${state.hoverObj.__graphObjType === 'node' ? 'Node' : 'Link'}Click`](state.hoverObj.__data);
      }
    }, false);

    // Setup renderer, camera and controls
    domNode.appendChild(state.renderer.domElement);
    let tbControls = new ThreeTrackballControls(state.camera, state.renderer.domElement);

    tbControls.panSpeed = 0.05
    tbControls.dynamicDampingFactor = 0.05
    tbControls.rotateSpeed = 1;
    state.renderer.setSize(state.width, state.height);
    state.camera.far = 20000;

    // Populate scene
    state.scene.add(state.forceGraph);
    state.scene.add(new three.AmbientLight(0xffffff));
    state.scene.add(new three.DirectionalLight(0xffffff, 0.6));
    var light1 = new three.PointLight( 0xffffff, 0.5, 400 );
    light1.position.set( 50, 50, 50 );
    state.scene.add( light1 );


    var light2 = new three.PointLight( 0xffffff, 0.5, 400 );
    light2.position.set( -50, -50, 50 );
    state.scene.add( light2 );

    var light3 = new three.PointLight( 0xffffff, 0.5, 400 );
    light3.position.set( 50, -50, -50 );
    state.scene.add( light3 );
    //

    // Kick-off renderer
    (function animate() { // IIFE
      if (state.enablePointerInteraction) {
        // Update tooltip and trigger onHover events
        raycaster.linePrecision = state.linkHoverPrecision;

        raycaster.setFromCamera(mousePos, state.camera);
        const intersects = raycaster.intersectObjects(state.forceGraph.children)
          .filter(o => ['node', 'link'].indexOf(o.object.__graphObjType) !== -1) // Check only node/link objects
          .sort((a, b) => { // Prioritize nodes over links
            const isNode = o => o.object.__graphObjType === 'node';
            return isNode(b) - isNode(a);
          });

        const topObject = intersects.length ? intersects[0].object : null;

        if (topObject !== state.hoverObj) {
          const prevObjType = state.hoverObj ? state.hoverObj.__graphObjType : null;
          const prevObjData = state.hoverObj ? state.hoverObj.__data : null;
          const objType = topObject ? topObject.__graphObjType : null;
          const objData = topObject ? topObject.__data : null;
          if (prevObjType && prevObjType !== objType) {
            // Hover out
            state[`on${prevObjType === 'node' ? 'Node' : 'Link'}Hover`](null, prevObjData);
          }
          if (objType) {
            // Hover in
            state[`on${objType === 'node' ? 'Node' : 'Link'}Hover`](objData, prevObjType === objType ? prevObjData : null);
          }

          let label = accessorFn(state[`${objType}Label`])(objData);
          toolTipElem.innerHTML = topObject && label !== undefined ? '<div class="tooltipContent">' + accessorFn(state[`${objType}Label`])(objData) + '</div>': '';

          state.hoverObj = topObject;
        }
      }

      // Frame cycle
      state.forceGraph.tickFrame();
      tbControls.update();
      state.renderer.render(state.scene, state.camera);
      requestAnimationFrame(animate);
    })();
  },

  update: function updateFn(state) {
    // resize canvas
    if (state.width && state.height) {
      state.renderer.setSize(state.width, state.height);
      state.camera.aspect = state.width/state.height;
      state.camera.updateProjectionMatrix();
    }

    state.navInfo.style.display = state.showNavInfo ? null : 'none';
  }

});
