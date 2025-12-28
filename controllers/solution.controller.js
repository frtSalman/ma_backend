import Solution from '../models/solution.model.js';

export async function getSolution(req, res) {
    const decodedPath = decodeURIComponent(req.params.path);

    console.trace(decodedPath);

    try {
        const record = await Solution.findOne({
            where: { path: decodedPath },
        });

        console.trace('Hata: ' + record);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Solution not found',
            });
        }

        return res.status(200).json({
            data: record.solution,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
}
