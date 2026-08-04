export default function VinylRecord({ track }) {
    if (!track) return null;

    return (
        <div className="vinyl-record">
            <div className="vinyl-record-grooves" />
            <div
                className="vinyl-record-label"
                style={track.artworkUrl ? { backgroundImage: `url(${track.artworkUrl})` } : undefined}
            />
        </div>
    );
}
