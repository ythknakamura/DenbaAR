<script lang="ts">
  import logo from './assets/logo.svg';
  import * as THREE from 'three';
  import {ArCtrl} from './arController';
  import {FieldPlot} from './fieldPlot';
  import {type MarkerInfo, ViewModes, CursorModes, DebugMode, Colors} from './settings';

  let dbgMsg = $state('');
  let selectedViewMode = $state(ViewModes[2]);
  let showEArrow = $state(true);
  let showEFLine = $state(true);
  let showContour = $state(true);

  ArCtrl.tickFunc = function(markers: MarkerInfo, cursor:THREE.Vector2){
    if(DebugMode){
      dbgMsg = `c(${cursor.x.toFixed(2)}, ${cursor.y.toFixed(2)}), `;
      for (const marker of Object.values(markers)) {
        if(marker.xy){
          dbgMsg += `${marker.charge} : (${marker.xy.x.toFixed(2)}, ${marker.xy.y.toFixed(2)}),   `; 
        }
      }
    }
    FieldPlot.setViewMode(selectedViewMode);
    FieldPlot.setCursorMode(showEArrow, showEFLine, showContour);
    FieldPlot.calcValues(markers, cursor);
  }
</script>

<svelte:head>
  <title>Denba AR</title>
</svelte:head>

<div id="menu">
  <div id="logo"><img src={logo} alt="" width="36px"></div>
  
  <div id="title">Denba AR</div>
  
  <fieldset class="filedset-select">
    カーソル設定
    <label>
      <input type="checkbox" bind:checked={showEArrow} style="accent-color: {Colors.EArrow}"/>
      {CursorModes[0]}
    </label>
    <label>
      <input type="checkbox" bind:checked={showEFLine} style="accent-color: {Colors.EFLine}"/>
      {CursorModes[1]}
    </label>
    <label>
      <input type="checkbox" bind:checked={showContour} style="accent-color: {Colors.Deni}"/>
      {CursorModes[2]}
    </label>
  </fieldset>

  <label class="label-select">
      <select bind:value={selectedViewMode}>
        {#each ViewModes as mode}
          <option value={mode}>{mode}</option>
        {/each}
      </select>
  </label>

</div>

{#if DebugMode}
<div id="debugbar">
  Message:{dbgMsg}
</div>
{/if}

<style>
#menu {
  position: fixed;
  inset: 0 0 auto;
  z-index: 20;
  background: rgba(255, 255, 255, 0.5);
  display: grid;
  grid-template-columns:auto 1fr;
  grid-auto-flow: column;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
}

#title {
  font-weight: bold;
  color: #333333;
}

#debugbar{
  position :fixed;
  inset: auto 0 0;
  z-index: 20;
  color: #aa0000;
  padding: 16px;
}

.label-select {
    display: inline-flex;
    align-items: center;
    position: relative;
}

.label-select::after {
    position: absolute;
    right: 15px;
    width: 10px;
    height: 7px;
    background-color: #535353;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
    content: '';
    pointer-events: none;
}

.label-select select {
    appearance: none;
    min-width: 150px;
    height: 2.8em;
    padding: .4em calc(.8em + 30px) .4em .8em;
    border: 1px solid #d0d0d0;
    border-radius: 8px;
    background-color: #eee;
    color: #333333;
    font-size: 1em;
    cursor: pointer;
}

.filedset-select {
  border: 1px solid #333333;
  border-radius: 8px;
  padding: 8px;
  margin: 8px;
  display: flex;
  flex-direction: row;
  align-items: center; 
}

.filedset-select label {
  margin: 8px;
}
</style>