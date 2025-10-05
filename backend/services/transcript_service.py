from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

def fetch_transcript(video_id: str, lang: str = "en") -> str:
    """
    Lấy transcript từ YouTube, trả về string text
    """
    try:
        print("*"*100)
        print("Fetching transcript for video ID:", video_id)
        print("*"*100)
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id, languages=[lang])
        as_dict = [snippet.text for snippet in transcript]
        print(as_dict)
        result = "".join(as_dict)
        print("*"*100)
        return result
    except TranscriptsDisabled:
        raise Exception("This video has transcripts disabled.")
    except NoTranscriptFound:
        raise Exception("No transcript found for this video.")
    except VideoUnavailable:
        raise Exception("The video is unavailable.")
    except Exception as e:
        raise Exception(f"Unexpected error while fetching transcript: {str(e)}")
