import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewPlayer } from "./ReviewPlayer";
afterEach(cleanup);
describe("seekable review player", () => {
  it("seeks forward/backward, reports time, clamps jumps and follows actual scene boundaries and thumbnails", () => {
    render(<ReviewPlayer src="/final.mp4" label="Final video" boundaries={[{scene_order:2,attempt:1,start_seconds:7.6,end_seconds:15.7},{scene_order:3,attempt:1,start_seconds:15.7,end_seconds:24}]} frames={[{index:1,timestamp_seconds:2.35,url:"/frame.jpg"}]} />);
    const video = screen.getByLabelText("Final video video") as HTMLVideoElement;
    expect(screen.getByLabelText("Final video seek")).toBeDisabled();
    Object.defineProperty(video, "duration", { configurable:true,value:24 }); fireEvent.loadedMetadata(video);
    const seek = screen.getByLabelText("Final video seek"); fireEvent.change(seek,{target:{value:"3"}}); expect(video.currentTime).toBe(3);
    fireEvent.change(seek,{target:{value:"10"}}); expect(video.currentTime).toBe(10); fireEvent.click(screen.getByText("−5s")); expect(video.currentTime).toBe(5);
    fireEvent.click(screen.getByText("+5s")); expect(video.currentTime).toBe(10); video.currentTime=12;fireEvent.timeUpdate(video);expect(screen.getByLabelText("Playback time")).toHaveTextContent("00:12 / 00:24");
    fireEvent.click(screen.getByRole("button",{name:/Scene 2/}));expect(video.currentTime).toBe(7.6);fireEvent.click(screen.getByRole("button",{name:/Scene 3/}));expect(video.currentTime).toBe(15.7);
    fireEvent.click(screen.getByRole("button",{name:/Seek to 2.35/}));expect(video.currentTime).toBe(2.35);fireEvent.click(screen.getByText("−5s"));expect(video.currentTime).toBe(0);
    video.currentTime=23;fireEvent.click(screen.getByText("+5s"));expect(video.currentTime).toBe(24);
    expect(video.controls).toBe(true);
  });
  it("resets media state when replacing the attempt and ignores invalid duration",()=>{
    const view=render(<ReviewPlayer src="/first.mp4" label="Scene 1"/>);const first=screen.getByLabelText("Scene 1 video") as HTMLVideoElement;Object.defineProperty(first,"duration",{value:8});fireEvent.loadedMetadata(first);first.currentTime=6;fireEvent.timeUpdate(first);
    view.rerender(<ReviewPlayer src="/second.mp4" label="Scene 1"/>);const second=screen.getByLabelText("Scene 1 video") as HTMLVideoElement;expect(second).not.toBe(first);Object.defineProperty(second,"duration",{value:Infinity});fireEvent.loadedMetadata(second);expect(screen.getByLabelText("Scene 1 seek")).toBeDisabled();expect(screen.getByLabelText("Playback time")).toHaveTextContent("00:00 / 00:00");
  });
});

it("previews exact slowdown using actual duration, resets to original and never applies creative tempo",()=>{
 render(<ReviewPlayer src="/eight.mp4" label="Scene 1"/>);const video=screen.getByLabelText("Scene 1 video") as HTMLVideoElement;Object.defineProperty(video,"duration",{value:8});fireEvent.loadedMetadata(video);const speed=screen.getByLabelText("Scene 1 playback speed");expect(speed).toHaveValue("1");fireEvent.change(speed,{target:{value:String(2/3)}});expect(video.playbackRate).toBe(2/3);expect(video.preservesPitch).toBe(true);expect(screen.getByLabelText("Scene 1 viewing duration")).toHaveTextContent("12 seconds");fireEvent.change(speed,{target:{value:"0.4"}});expect(screen.getByLabelText("Scene 1 viewing duration")).toHaveTextContent("20 seconds");fireEvent.change(speed,{target:{value:"1"}});expect(video.playbackRate).toBe(1);expect(video.getAttribute("src")).toBe("/eight.mp4");
});
it("reports unsupported browser slowdown and keeps original playback",()=>{
 render(<ReviewPlayer src="/unsupported.mp4" label="Scene 1"/>);const video=screen.getByLabelText("Scene 1 video") as HTMLVideoElement;let rate=1;Object.defineProperty(video,"playbackRate",{configurable:true,get:()=>rate,set:(next:number)=>{if(next===0.4)throw new Error("Unsupported");rate=next;}});fireEvent.change(screen.getByLabelText("Scene 1 playback speed"),{target:{value:"0.4"}});expect(rate).toBe(1);expect(screen.getByText(/This browser cannot preview the selected speed/)).toBeVisible();rate=2;fireEvent.rateChange(video);expect(rate).toBe(1);
});
