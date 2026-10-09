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
