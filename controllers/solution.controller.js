import Solution from '../models/solution.model.js';

export async function getSolution(req, res) {
    const { path } = req.params;
    console.trace(path);

    try {
        const { solution } = await Solution.findOne({ where: { path: path } });
        console.log(solution);
        return res.status(200).json({
            data: solution,
        });
    } catch (error) {
        console.trace(error.message);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası oluştu.',
        });
    }
}
